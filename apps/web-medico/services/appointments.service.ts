import { schedulingApi } from '../lib/api';
import type {
  Appointment,
  CreateAppointmentDto,
  UpdateAppointmentDto,
  AvailableSlot,
  CalendarAppointment,
} from '../types';

export interface AppointmentsFilters {
  patientId?: string;
  professionalId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  date?: string; // Para buscar de um dia específico
}

// Listar agendamentos
export const getAppointments = async (filters: AppointmentsFilters = {}): Promise<Appointment[]> => {
  const params = new URLSearchParams();

  if (filters.patientId) params.append('patientId', filters.patientId);
  if (filters.professionalId) params.append('professionalId', filters.professionalId);
  if (filters.status) params.append('status', filters.status);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.date) params.append('date', filters.date);

  const response = await schedulingApi.get<Appointment[]>(`/scheduling/appointments?${params}`);
  return response.data;
};

// Buscar agendamentos do dia (para dashboard)
export const getTodayAppointments = async (): Promise<CalendarAppointment[]> => {
  const today = new Date().toISOString().split('T')[0];
  const response = await schedulingApi.get<CalendarAppointment[]>(
    `/scheduling/appointments?date=${today}`
  );
  return response.data;
};

// Buscar agendamento por ID
export const getAppointmentById = async (id: string): Promise<Appointment> => {
  const response = await schedulingApi.get<Appointment>(`/scheduling/appointments/${id}`);
  return response.data;
};

// Buscar agendamentos de um paciente
export const getAppointmentsByPatient = async (patientId: string): Promise<Appointment[]> => {
  const response = await schedulingApi.get<Appointment[]>(
    `/scheduling/appointments/patient/${patientId}`
  );
  return response.data;
};

// Criar agendamento
export const createAppointment = async (data: CreateAppointmentDto): Promise<Appointment> => {
  const response = await schedulingApi.post<Appointment>('/scheduling/appointments', data);
  return response.data;
};

// Atualizar agendamento
export const updateAppointment = async (
  id: string,
  data: UpdateAppointmentDto
): Promise<Appointment> => {
  const response = await schedulingApi.put<Appointment>(`/scheduling/appointments/${id}`, data);
  return response.data;
};

// Cancelar agendamento
export const cancelAppointment = async (id: string, reason?: string): Promise<void> => {
  await schedulingApi.delete(`/scheduling/appointments/${id}`, {
    data: { reason },
  });
};

// Confirmar agendamento
export const confirmAppointment = async (id: string): Promise<Appointment> => {
  const response = await schedulingApi.patch<Appointment>(`/scheduling/appointments/${id}/confirm`);
  return response.data;
};

// Iniciar atendimento
export const startAppointment = async (id: string): Promise<Appointment> => {
  const response = await schedulingApi.patch<Appointment>(`/scheduling/appointments/${id}/start`);
  return response.data;
};

// Concluir atendimento
export const completeAppointment = async (id: string, notes?: string): Promise<Appointment> => {
  const response = await schedulingApi.patch<Appointment>(`/scheduling/appointments/${id}/complete`, {
    notes,
  });
  return response.data;
};

// Marcar como não compareceu
export const markNoShow = async (id: string): Promise<Appointment> => {
  const response = await schedulingApi.patch<Appointment>(`/scheduling/appointments/${id}/no-show`);
  return response.data;
};

// Verificar disponibilidade
export const getAvailability = async (
  date: string,
  professionalId?: string
): Promise<AvailableSlot[]> => {
  const params = new URLSearchParams({ date });
  if (professionalId) params.append('professionalId', professionalId);

  const response = await schedulingApi.get<AvailableSlot[]>(`/scheduling/availability?${params}`);
  return response.data;
};

// Buscar próximo horário disponível
export const getNextAvailableSlot = async (
  startDate: string,
  professionalId?: string
): Promise<AvailableSlot | null> => {
  const params = new URLSearchParams({ startDate });
  if (professionalId) params.append('professionalId', professionalId);

  try {
    const response = await schedulingApi.get<AvailableSlot>(`/scheduling/availability/next?${params}`);
    return response.data;
  } catch (error: unknown) {
    if ((error as { response?: { status: number } }).response?.status === 404) {
      return null;
    }
    throw error;
  }
};
