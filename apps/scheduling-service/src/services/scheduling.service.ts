import { Injectable, Inject, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ISchedulingAdapter } from '../adapters/scheduling-adapter.interface';
import { CreateAppointmentDto } from '../adapters/dtos/create-appointment.dto';
import { UpdateAppointmentDto } from '../adapters/dtos/update-appointment.dto';
import { AvailabilityFiltersDto } from '../adapters/dtos/availability-filters.dto';
import { Appointment, AppointmentStatus } from '../entities/appointment.entity';
import {
  AppointmentSyncLog,
  SyncOperation,
} from '../entities/appointment-sync-log.entity';
import { AvailableSlot } from '../adapters/types/appointment-result.type';
import { RetryService } from '../resilience/retry.service';
import { CircuitBreakerService } from '../resilience/circuit-breaker.service';
import { RabbitMQService } from '../messaging/rabbitmq.service';

/**
 * Service responsável pela lógica de negócio de agendamentos.
 *
 * Funciona como uma camada de orquestração que:
 * 1. Valida regras de negócio
 * 2. Chama o adapter apropriado (com retry + circuit breaker)
 * 3. Persiste dados no banco local
 * 4. Registra logs de sincronização
 * 5. Publica eventos para Core Service via RabbitMQ
 * 6. Trata erros e inconsistências
 */
@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(
    @Inject('SCHEDULING_ADAPTER')
    private readonly adapter: ISchedulingAdapter,

    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,

    @InjectRepository(AppointmentSyncLog)
    private readonly syncLogRepository: Repository<AppointmentSyncLog>,

    private readonly retryService: RetryService,
    private readonly circuitBreakerService: CircuitBreakerService,

    @Optional()
    private readonly rabbitmqService?: RabbitMQService,
  ) {
    this.logger.log(`Using adapter: ${this.adapter.name}`);
    if (!this.rabbitmqService) {
      this.logger.warn('RabbitMQ service not available - events will not be published');
    }
  }

  /**
   * Cria um novo agendamento
   */
  async createAppointment(dto: CreateAppointmentDto): Promise<Appointment> {
    this.logger.log(`Creating appointment for patient ${dto.patientId}`);

    let syncLog: AppointmentSyncLog;
    let appointment: Appointment | undefined;

    try {
      // 1. Chama o adapter para criar no sistema externo (com retry + circuit breaker)
      const result = await this.circuitBreakerService.execute(() =>
        this.retryService.execute(() => this.adapter.createAppointment(dto)),
      );

      if (!result.success || !result.externalId) {
        throw new Error(result.error || 'Failed to create appointment in external system');
      }

      // 2. Cria registro local
      appointment = this.appointmentRepository.create({
        externalId: result.externalId,
        adapterType: this.adapter.name,
        patientId: dto.patientId,
        professionalId: dto.professionalId,
        scheduledAt: new Date(dto.scheduledAt),
        status: AppointmentStatus.CONFIRMED,
        notes: dto.notes,
        metadata: dto.metadata,
      });

      appointment = await this.appointmentRepository.save(appointment);

      // 3. Salva log de sucesso
      syncLog = this.syncLogRepository.create({
        appointmentId: appointment.id,
        adapterType: this.adapter.name,
        operation: SyncOperation.CREATE,
        request: dto,
        response: result,
        success: true,
      });

      await this.syncLogRepository.save(syncLog);

      this.logger.log(`Appointment created successfully: ${appointment.id}`);

      return appointment;
    } catch (error) {
      this.logger.error(`Failed to create appointment: ${error.message}`, error.stack);

      // Salva log de erro (se temos o appointment ID)
      if (appointment?.id) {
        syncLog = this.syncLogRepository.create({
          appointmentId: appointment.id,
          adapterType: this.adapter.name,
          operation: SyncOperation.CREATE,
          request: dto,
          success: false,
          error: error.message,
        });

        await this.syncLogRepository.save(syncLog);
      }

      throw error;
    }
  }

  /**
   * Atualiza um agendamento existente
   */
  async updateAppointment(
    id: string,
    dto: UpdateAppointmentDto,
  ): Promise<Appointment> {
    this.logger.log(`Updating appointment ${id}`);

    // 1. Busca appointment local
    const appointment = await this.appointmentRepository.findOne({
      where: { id },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment not found: ${id}`);
    }

    if (!appointment.externalId) {
      throw new Error('Appointment does not have an external ID');
    }

    const externalId = appointment.externalId; // Type guard

    try {
      // 2. Atualiza no sistema externo (com retry + circuit breaker)
      const result = await this.circuitBreakerService.execute(() =>
        this.retryService.execute(() =>
          this.adapter.updateAppointment(externalId, dto),
        ),
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to update appointment in external system');
      }

      // 3. Atualiza localmente
      if (dto.scheduledAt) {
        appointment.scheduledAt = new Date(dto.scheduledAt);
      }
      if (dto.professionalId) {
        appointment.professionalId = dto.professionalId;
      }
      if (dto.notes) {
        appointment.notes = dto.notes;
      }
      if (dto.metadata) {
        appointment.metadata = { ...appointment.metadata, ...dto.metadata };
      }

      await this.appointmentRepository.save(appointment);

      // 4. Salva log
      const syncLog = this.syncLogRepository.create({
        appointmentId: appointment.id,
        adapterType: this.adapter.name,
        operation: SyncOperation.UPDATE,
        request: dto,
        response: result,
        success: true,
      });

      await this.syncLogRepository.save(syncLog);

      this.logger.log(`Appointment updated successfully: ${id}`);

      // 5. Publica evento para Core Service
      if (this.rabbitmqService) {
        await this.rabbitmqService.publishAppointmentUpdated({
          appointmentId: appointment.id,
          patientId: appointment.patientId,
          professionalId: appointment.professionalId,
          scheduledAt: appointment.scheduledAt,
          status: appointment.status,
        });
      }

      return appointment;
    } catch (error) {
      this.logger.error(`Failed to update appointment: ${error.message}`, error.stack);

      // Salva log de erro
      const syncLog = this.syncLogRepository.create({
        appointmentId: appointment.id,
        adapterType: this.adapter.name,
        operation: SyncOperation.UPDATE,
        request: dto,
        success: false,
        error: error.message,
      });

      await this.syncLogRepository.save(syncLog);

      throw error;
    }
  }

  /**
   * Cancela um agendamento
   */
  async cancelAppointment(id: string, reason?: string): Promise<void> {
    this.logger.log(`Cancelling appointment ${id}`);

    // 1. Busca appointment local
    const appointment = await this.appointmentRepository.findOne({
      where: { id },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment not found: ${id}`);
    }

    if (!appointment.externalId) {
      throw new Error('Appointment does not have an external ID');
    }

    const externalId = appointment.externalId; // Type guard

    try {
      // 2. Cancela no sistema externo (com retry + circuit breaker)
      await this.circuitBreakerService.execute(() =>
        this.retryService.execute(() =>
          this.adapter.cancelAppointment(externalId, reason),
        ),
      );

      // 3. Atualiza status local
      appointment.status = AppointmentStatus.CANCELLED;
      if (reason) {
        appointment.notes = appointment.notes
          ? `${appointment.notes}\nCancellation reason: ${reason}`
          : `Cancellation reason: ${reason}`;
      }

      await this.appointmentRepository.save(appointment);

      // 4. Salva log
      const syncLog = this.syncLogRepository.create({
        appointmentId: appointment.id,
        adapterType: this.adapter.name,
        operation: SyncOperation.CANCEL,
        request: { reason },
        success: true,
      });

      await this.syncLogRepository.save(syncLog);

      this.logger.log(`Appointment cancelled successfully: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to cancel appointment: ${error.message}`, error.stack);

      // Salva log de erro
      const syncLog = this.syncLogRepository.create({
        appointmentId: appointment.id,
        adapterType: this.adapter.name,
        operation: SyncOperation.CANCEL,
        request: { reason },
        success: false,
        error: error.message,
      });

      await this.syncLogRepository.save(syncLog);

      throw error;
    }
  }

  /**
   * Busca um agendamento por ID
   */
  async getAppointment(id: string): Promise<Appointment> {
    this.logger.log(`Fetching appointment ${id}`);

    const appointment = await this.appointmentRepository.findOne({
      where: { id },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment not found: ${id}`);
    }

    return appointment;
  }

  /**
   * Busca agendamentos de um paciente
   */
  async getAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
    this.logger.log(`Fetching appointments for patient ${patientId}`);

    return this.appointmentRepository.find({
      where: { patientId },
      order: { scheduledAt: 'DESC' },
    });
  }

  /**
   * Verifica disponibilidade de horários
   */
  async checkAvailability(
    filters: AvailabilityFiltersDto,
  ): Promise<AvailableSlot[]> {
    this.logger.log(`Checking availability from ${filters.startDate}`);

    // Circuit breaker sem retry (é uma operação read-only)
    return this.circuitBreakerService.execute(() =>
      this.adapter.checkAvailability(filters),
    );
  }

  /**
   * Health check do adapter
   */
  async healthCheck(): Promise<{ adapter: string; healthy: boolean }> {
    const healthy = await this.adapter.healthCheck();

    return {
      adapter: this.adapter.name,
      healthy,
    };
  }
}
