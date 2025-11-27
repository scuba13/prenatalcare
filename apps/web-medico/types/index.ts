// Re-export all types
export * from './citizen';
export * from './pregnancy';
export * from './appointment';
export * from './task';
export * from './clinical-observation';

// Common API types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// Timeline types
export interface TimelineEvent {
  id: string;
  type: 'consultation' | 'exam' | 'vaccine' | 'observation' | 'alert' | 'task';
  title: string;
  description?: string;
  date: string;
  gestationalWeek?: number;
  gestationalDay?: number;
  status?: string;
  data?: Record<string, unknown>;
}

export interface Timeline {
  pregnancy: import('./pregnancy').Pregnancy;
  citizen: import('./citizen').Citizen;
  events: TimelineEvent[];
}

// Dashboard stats
export interface DashboardStats {
  totalPatients: number;
  activePregnancies: number;
  todayAppointments: number;
  highRiskPatients: number;
  pendingExams: number;
  pendingTasks: number;
}

// Alerts
export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  patientId?: string;
  patientName?: string;
  createdAt: string;
  read: boolean;
}
