import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import { SchedulingService } from '../services/scheduling.service';
import { CreateAppointmentDto } from '../adapters/dtos/create-appointment.dto';

/**
 * Listener responsável por processar eventos de agendamento vindos do Core Service.
 *
 * Eventos consumidos:
 * - scheduling.create_appointment (criar agendamento)
 * - scheduling.cancel_appointment (cancelar agendamento)
 *
 * Para cada evento processado, publica resposta para o Core Service:
 * - core.confirmed (sucesso na criação)
 * - core.failed (falha na criação/cancelamento)
 * - core.cancelled (sucesso no cancelamento)
 */
@Injectable()
export class AppointmentListener implements OnModuleInit {
  private readonly logger = new Logger(AppointmentListener.name);

  constructor(
    private readonly rabbitmqService: RabbitMQService,
    private readonly schedulingService: SchedulingService,
  ) {}

  async onModuleInit() {
    // Aguarda RabbitMQ conectar
    await this.waitForConnection();

    // Inicia consumo das filas
    await this.startListening();
  }

  /**
   * Aguarda conexão com RabbitMQ
   */
  private async waitForConnection(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 30; // 30 segundos

    while (!this.rabbitmqService.isConnected() && attempts < maxAttempts) {
      this.logger.log('Waiting for RabbitMQ connection...');
      await this.sleep(1000);
      attempts++;
    }

    if (!this.rabbitmqService.isConnected()) {
      throw new Error('Failed to connect to RabbitMQ after 30 seconds');
    }
  }

  /**
   * Inicia escuta das filas
   */
  private async startListening(): Promise<void> {
    this.logger.log('Starting appointment event listeners...');

    // Listener: CREATE APPOINTMENT
    await this.rabbitmqService.consume(
      'scheduling.create_appointment',
      this.handleCreateAppointment.bind(this),
    );

    // Listener: CANCEL APPOINTMENT
    await this.rabbitmqService.consume(
      'scheduling.cancel_appointment',
      this.handleCancelAppointment.bind(this),
    );

    this.logger.log('✅ Appointment listeners started');
  }

  /**
   * Handler: CREATE APPOINTMENT
   * Recebe evento do Core Service e cria agendamento
   */
  private async handleCreateAppointment(message: any): Promise<void> {
    this.logger.log(`Processing CREATE APPOINTMENT event: ${JSON.stringify(message)}`);

    try {
      // Valida estrutura da mensagem
      if (!message.data) {
        throw new Error('Invalid message format: missing data field');
      }

      const dto: CreateAppointmentDto = message.data;

      // Cria agendamento via SchedulingService
      const appointment = await this.schedulingService.createAppointment(dto);

      this.logger.log(`✅ Appointment created: ${appointment.id}`);

      // Publica evento de sucesso para Core Service
      await this.rabbitmqService.publishAppointmentConfirmed({
        appointmentId: appointment.id,
        externalId: appointment.externalId,
        patientId: appointment.patientId,
        professionalId: appointment.professionalId,
        scheduledAt: appointment.scheduledAt,
        status: appointment.status,
        adapterType: appointment.adapterType,
        metadata: appointment.metadata,
      });

      this.logger.log(`✅ Published confirmation to Core Service`);
    } catch (error) {
      this.logger.error(`❌ Failed to create appointment: ${error.message}`, error.stack);

      // Publica evento de falha para Core Service
      await this.rabbitmqService.publishAppointmentFailed(
        error.message,
        message.data,
      );

      this.logger.log(`✅ Published failure to Core Service`);
    }
  }

  /**
   * Handler: CANCEL APPOINTMENT
   * Recebe evento do Core Service e cancela agendamento
   */
  private async handleCancelAppointment(message: any): Promise<void> {
    this.logger.log(`Processing CANCEL APPOINTMENT event: ${JSON.stringify(message)}`);

    try {
      // Valida estrutura da mensagem
      if (!message.data || !message.data.appointmentId) {
        throw new Error('Invalid message format: missing appointmentId');
      }

      const { appointmentId, reason } = message.data;

      // Cancela agendamento via SchedulingService
      await this.schedulingService.cancelAppointment(appointmentId, reason);

      this.logger.log(`✅ Appointment cancelled: ${appointmentId}`);

      // Busca dados atualizados do agendamento
      const appointment = await this.schedulingService.getAppointment(appointmentId);

      // Publica evento de cancelamento para Core Service
      await this.rabbitmqService.publishAppointmentCancelled({
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        status: appointment.status,
        reason,
      });

      this.logger.log(`✅ Published cancellation to Core Service`);
    } catch (error) {
      this.logger.error(`❌ Failed to cancel appointment: ${error.message}`, error.stack);

      // Publica evento de falha para Core Service
      await this.rabbitmqService.publishAppointmentFailed(
        error.message,
        message.data,
      );

      this.logger.log(`✅ Published failure to Core Service`);
    }
  }

  /**
   * Helper para sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
