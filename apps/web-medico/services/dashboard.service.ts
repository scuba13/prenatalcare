import { coreApi, schedulingApi } from '../lib/api';
import type { DashboardStats, Alert, Appointment } from '../types';

// Buscar estatísticas do dashboard
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await coreApi.get<DashboardStats>('/api/v1/dashboard/stats');
  return response.data;
};

// Buscar alertas urgentes
export const getAlerts = async (): Promise<Alert[]> => {
  const response = await coreApi.get<Alert[]>('/api/v1/alerts?unread=true&limit=10');
  return response.data;
};

// Marcar alerta como lido
export const markAlertAsRead = async (alertId: string): Promise<void> => {
  await coreApi.patch(`/api/v1/alerts/${alertId}/read`);
};

// Buscar consultas de hoje
export interface TodayAppointment {
  id: string;
  patientId: string;
  patientName: string;
  scheduledAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
}

export const getTodayAppointments = async (): Promise<TodayAppointment[]> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await schedulingApi.get<TodayAppointment[]>(
      `/api/v1/scheduling/appointments/date/${today}`
    );
    return response.data;
  } catch {
    // Se não conseguir buscar do scheduling, retorna lista vazia
    return [];
  }
};
