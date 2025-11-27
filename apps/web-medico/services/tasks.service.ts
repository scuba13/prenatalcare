import { coreApi } from '../lib/api';
import type {
  Task,
  CreateTaskDto,
  UpdateTaskDto,
  CompleteTaskDto,
  PaginatedResponse,
} from '../types';

export interface TasksFilters {
  page?: number;
  limit?: number;
  pregnancyId?: string;
  type?: string;
  status?: string;
  priorityLevel?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
}

// Listar tarefas
export const getTasks = async (filters: TasksFilters = {}): Promise<PaginatedResponse<Task>> => {
  const params = new URLSearchParams();

  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.pregnancyId) params.append('pregnancyId', filters.pregnancyId);
  if (filters.type) params.append('type', filters.type);
  if (filters.status) params.append('status', filters.status);
  if (filters.priorityLevel) params.append('priorityLevel', filters.priorityLevel);
  if (filters.dueDateFrom) params.append('dueDateFrom', filters.dueDateFrom);
  if (filters.dueDateTo) params.append('dueDateTo', filters.dueDateTo);

  const response = await coreApi.get<PaginatedResponse<Task>>(`/api/v1/tasks?${params}`);
  return response.data;
};

// Buscar tarefas pendentes (para dashboard)
export const getPendingTasks = async (): Promise<Task[]> => {
  const response = await coreApi.get<Task[]>('/api/v1/tasks?status=pending&limit=100');
  return response.data;
};

// Buscar exames pendentes
export const getPendingExams = async (): Promise<Task[]> => {
  const response = await coreApi.get<Task[]>('/api/v1/tasks?type=exam&status=pending&limit=100');
  return response.data;
};

// Buscar tarefa por ID
export const getTaskById = async (id: string): Promise<Task> => {
  const response = await coreApi.get<Task>(`/api/v1/tasks/${id}`);
  return response.data;
};

// Buscar tarefas de uma gestação
export const getTasksByPregnancy = async (
  pregnancyId: string,
  filters: Partial<TasksFilters> = {}
): Promise<Task[]> => {
  const params = new URLSearchParams({ pregnancyId });

  if (filters.type) params.append('type', filters.type);
  if (filters.status) params.append('status', filters.status);

  const response = await coreApi.get<Task[]>(`/api/v1/tasks?${params}`);
  return response.data;
};

// Criar tarefa
export const createTask = async (data: CreateTaskDto): Promise<Task> => {
  const response = await coreApi.post<Task>('/api/v1/tasks', data);
  return response.data;
};

// Atualizar tarefa
export const updateTask = async (id: string, data: UpdateTaskDto): Promise<Task> => {
  const response = await coreApi.patch<Task>(`/api/v1/tasks/${id}`, data);
  return response.data;
};

// Completar tarefa
export const completeTask = async (id: string, data: CompleteTaskDto = {}): Promise<Task> => {
  const response = await coreApi.post<Task>(`/api/v1/tasks/${id}/complete`, data);
  return response.data;
};

// Cancelar tarefa
export const cancelTask = async (id: string, reason: string): Promise<Task> => {
  const response = await coreApi.post<Task>(`/api/v1/tasks/${id}/cancel`, { reason });
  return response.data;
};

// Deletar tarefa
export const deleteTask = async (id: string): Promise<void> => {
  await coreApi.delete(`/api/v1/tasks/${id}`);
};

// Criar múltiplas tarefas (ex: exames de uma consulta)
export const createBulkTasks = async (tasks: CreateTaskDto[]): Promise<Task[]> => {
  const response = await coreApi.post<Task[]>('/api/v1/tasks/bulk', { tasks });
  return response.data;
};

// Tarefas comuns de pré-natal (templates)
export const PRENATAL_EXAM_TEMPLATES = [
  { code: 'hemograma', title: 'Hemograma completo', type: 'exam' as const },
  { code: 'glicemia', title: 'Glicemia de jejum', type: 'exam' as const },
  { code: 'tipagem', title: 'Tipagem sanguínea e Fator Rh', type: 'exam' as const },
  { code: 'urina', title: 'Urina tipo I e urocultura', type: 'exam' as const },
  { code: 'vdrl', title: 'VDRL (Sífilis)', type: 'exam' as const },
  { code: 'hiv', title: 'Sorologia HIV', type: 'exam' as const },
  { code: 'hepatiteB', title: 'Sorologia Hepatite B (HBsAg)', type: 'exam' as const },
  { code: 'toxoplasmose', title: 'Sorologia Toxoplasmose', type: 'exam' as const },
  { code: 'us_obstetrico', title: 'Ultrassonografia obstétrica', type: 'ultrasound' as const },
  { code: 'us_morfologico', title: 'Ultrassonografia morfológica', type: 'ultrasound' as const },
] as const;

export const PRENATAL_VACCINE_TEMPLATES = [
  { code: 'dtpa', title: 'Vacina dTpa (difteria, tétano, coqueluche)', type: 'vaccine' as const },
  { code: 'hepatiteB', title: 'Vacina Hepatite B', type: 'vaccine' as const },
  { code: 'influenza', title: 'Vacina Influenza', type: 'vaccine' as const },
  { code: 'covid19', title: 'Vacina COVID-19', type: 'vaccine' as const },
] as const;
