import { AppointmentStatus } from '../../entities/appointment.entity';

export interface AppointmentResult {
  success: boolean;
  externalId?: string; // ID no sistema externo
  appointment?: {
    id: string;
    externalId?: string;
    patientId: string;
    professionalId?: string;
    scheduledAt: Date;
    status: AppointmentStatus;
    notes?: string;
    metadata?: Record<string, any>;
  };
  error?: string;
}

export interface AvailableSlot {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  available: boolean;
  professional?: string;
  location?: string;
  metadata?: Record<string, any>;
}
