import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ISchedulingAdapter } from '../scheduling-adapter.interface';
import { CreateAppointmentDto } from '../dtos/create-appointment.dto';
import { UpdateAppointmentDto } from '../dtos/update-appointment.dto';
import { AvailabilityFiltersDto } from '../dtos/availability-filters.dto';
import {
  AppointmentResult,
  AvailableSlot,
} from '../types/appointment-result.type';
import { AppointmentStatus } from '../../entities/appointment.entity';

/**
 * Mock Adapter para simulação de sistema de agendamento hospitalar.
 *
 * Este adapter simula:
 * - Latência de rede (100-500ms)
 * - Geração de slots de disponibilidade (8h-17h, 70% disponíveis)
 * - Armazenamento em memória
 * - Erros ocasionais para testar retry (5% de chance)
 *
 * Usado em:
 * - Desenvolvimento local
 * - Testes automatizados
 * - Demonstrações sem sistemas externos
 */
@Injectable()
export class MockSchedulingAdapter implements ISchedulingAdapter {
  private readonly logger = new Logger(MockSchedulingAdapter.name);
  private readonly appointments: Map<string, any> = new Map();
  readonly name = 'MockSchedulingAdapter';

  async createAppointment(
    data: CreateAppointmentDto,
  ): Promise<AppointmentResult> {
    this.logger.log(`Creating appointment for patient ${data.patientId}`);

    // Simula latência de rede
    await this.simulateDelay();

    // Simula erro ocasional (5% de chance)
    if (Math.random() < 0.05) {
      throw new Error('Mock: Simulated network error during appointment creation');
    }

    const externalId = `MOCK-${Date.now()}-${uuidv4().substring(0, 8)}`;
    const id = uuidv4();

    const appointment = {
      id,
      externalId,
      patientId: data.patientId,
      professionalId: data.professionalId,
      scheduledAt: new Date(data.scheduledAt),
      status: AppointmentStatus.CONFIRMED,
      notes: data.notes,
      metadata: data.metadata,
      createdAt: new Date(),
    };

    this.appointments.set(externalId, appointment);

    this.logger.log(`Appointment created successfully: ${externalId}`);

    return {
      success: true,
      externalId,
      appointment,
    };
  }

  async updateAppointment(
    externalId: string,
    data: UpdateAppointmentDto,
  ): Promise<AppointmentResult> {
    this.logger.log(`Updating appointment ${externalId}`);

    await this.simulateDelay();

    const appointment = this.appointments.get(externalId);

    if (!appointment) {
      return {
        success: false,
        error: `Appointment not found: ${externalId}`,
      };
    }

    // Atualiza campos fornecidos
    if (data.scheduledAt) {
      appointment.scheduledAt = new Date(data.scheduledAt);
    }
    if (data.professionalId) {
      appointment.professionalId = data.professionalId;
    }
    if (data.notes) {
      appointment.notes = data.notes;
    }
    if (data.metadata) {
      appointment.metadata = { ...appointment.metadata, ...data.metadata };
    }

    appointment.updatedAt = new Date();

    this.appointments.set(externalId, appointment);

    this.logger.log(`Appointment updated successfully: ${externalId}`);

    return {
      success: true,
      externalId,
      appointment,
    };
  }

  async cancelAppointment(
    externalId: string,
    reason?: string,
  ): Promise<void> {
    this.logger.log(`Cancelling appointment ${externalId}. Reason: ${reason}`);

    await this.simulateDelay();

    const appointment = this.appointments.get(externalId);

    if (!appointment) {
      throw new Error(`Appointment not found: ${externalId}`);
    }

    appointment.status = AppointmentStatus.CANCELLED;
    appointment.notes = reason
      ? `${appointment.notes || ''}\nCancellation reason: ${reason}`
      : appointment.notes;
    appointment.updatedAt = new Date();

    this.appointments.set(externalId, appointment);

    this.logger.log(`Appointment cancelled successfully: ${externalId}`);
  }

  async getAppointment(externalId: string): Promise<AppointmentResult> {
    this.logger.log(`Fetching appointment ${externalId}`);

    await this.simulateDelay();

    const appointment = this.appointments.get(externalId);

    if (!appointment) {
      return {
        success: false,
        error: `Appointment not found: ${externalId}`,
      };
    }

    return {
      success: true,
      externalId,
      appointment,
    };
  }

  async checkAvailability(
    filters: AvailabilityFiltersDto,
  ): Promise<AvailableSlot[]> {
    this.logger.log(`Checking availability from ${filters.startDate}`);

    await this.simulateDelay();

    const slots: AvailableSlot[] = [];
    const startDate = new Date(filters.startDate);
    const endDate = filters.endDate
      ? new Date(filters.endDate)
      : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 dias

    // Gera slots para cada dia no range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      // Pula domingos
      if (currentDate.getDay() !== 0) {
        // Horários das 8h às 17h (intervalos de 30 min)
        for (let hour = 8; hour < 17; hour++) {
          for (let minute of [0, 30]) {
            const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

            // 70% de disponibilidade aleatória
            const available = Math.random() > 0.3;

            slots.push({
              date: currentDate.toISOString().split('T')[0],
              time,
              available,
              professional:
                filters.professionalId || `mock-professional-${Math.floor(Math.random() * 5) + 1}`,
              location: `Sala ${Math.floor(Math.random() * 10) + 101}`,
              metadata: {
                specialty: filters.specialty || 'Obstetrícia',
                duration: 30, // minutos
              },
            });
          }
        }
      }

      // Próximo dia
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Retorna apenas slots disponíveis
    const availableSlots = slots.filter((s) => s.available);

    this.logger.log(
      `Found ${availableSlots.length} available slots out of ${slots.length} total`,
    );

    return availableSlots;
  }

  async healthCheck(): Promise<boolean> {
    await this.simulateDelay(50); // Health check rápido (50ms)

    // Mock sempre está "saudável"
    return true;
  }

  /**
   * Simula latência de rede (100-500ms por padrão)
   */
  private async simulateDelay(baseDelay = 100): Promise<void> {
    const delay = baseDelay + Math.random() * 400; // 100-500ms
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Limpa todos os agendamentos armazenados (útil para testes)
   */
  clearAppointments(): void {
    this.logger.warn('Clearing all mock appointments');
    this.appointments.clear();
  }

  /**
   * Retorna número de agendamentos armazenados (útil para testes)
   */
  getAppointmentCount(): number {
    return this.appointments.size;
  }
}
