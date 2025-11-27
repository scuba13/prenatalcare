export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface Appointment {
  id: string;
  externalId?: string;
  adapterType: string;
  patientId: string;
  professionalId?: string;
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  status: AppointmentStatus;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentDto {
  patientId: string;
  professionalId?: string;
  scheduledAt: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateAppointmentDto {
  scheduledAt?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  professionalId?: string;
  professionalName?: string;
}

export interface AvailabilityFilters {
  date: string;
  professionalId?: string;
}

// Para exibição no calendário/agenda
export interface CalendarAppointment extends Appointment {
  patientName?: string;
  patientCpf?: string;
  gestationalAge?: string;
}
