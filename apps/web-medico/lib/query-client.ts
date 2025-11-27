import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      gcTime: 1000 * 60 * 30, // 30 minutos (anteriormente cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Query keys para invalidação
export const queryKeys = {
  // Citizens
  citizens: ['citizens'] as const,
  citizen: (id: string) => ['citizens', id] as const,
  citizenByCpf: (cpf: string) => ['citizens', 'cpf', cpf] as const,

  // Pregnancies
  pregnancies: ['pregnancies'] as const,
  pregnancy: (id: string) => ['pregnancies', id] as const,
  pregnancyTimeline: (id: string) => ['pregnancies', id, 'timeline'] as const,
  pregnancyCitizen: (citizenId: string) => ['pregnancies', 'citizen', citizenId] as const,
  activePregnancy: (citizenId: string) => ['pregnancies', 'citizen', citizenId, 'active'] as const,

  // Appointments
  appointments: ['appointments'] as const,
  appointment: (id: string) => ['appointments', id] as const,
  todayAppointments: ['appointments', 'today'] as const,
  patientAppointments: (patientId: string) => ['appointments', 'patient', patientId] as const,
  availability: (date: string) => ['availability', date] as const,

  // Tasks
  tasks: ['tasks'] as const,
  task: (id: string) => ['tasks', id] as const,
  pregnancyTasks: (pregnancyId: string) => ['tasks', 'pregnancy', pregnancyId] as const,
  pendingTasks: ['tasks', 'pending'] as const,
  pendingExams: ['tasks', 'pending', 'exams'] as const,

  // Clinical Observations
  observations: ['observations'] as const,
  observation: (id: string) => ['observations', id] as const,
  pregnancyObservations: (pregnancyId: string) => ['observations', 'pregnancy', pregnancyId] as const,

  // Dashboard
  dashboardStats: ['dashboard', 'stats'] as const,
  alerts: ['alerts'] as const,

  // Auth
  currentUser: ['auth', 'me'] as const,
};
