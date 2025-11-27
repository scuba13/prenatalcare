import { coreApi } from '../lib/api';
import type {
  Pregnancy,
  CreatePregnancyDto,
  UpdatePregnancyDto,
  Timeline,
  PaginatedResponse,
} from '../types';

export interface PregnanciesFilters {
  page?: number;
  limit?: number;
  citizenId?: string;
  status?: 'active' | 'completed' | 'terminated';
  riskLevel?: 'habitual' | 'intermediario' | 'alto';
}

// Listar gestações
export const getPregnancies = async (filters: PregnanciesFilters = {}): Promise<PaginatedResponse<Pregnancy>> => {
  const params = new URLSearchParams();

  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.citizenId) params.append('citizenId', filters.citizenId);
  if (filters.status) params.append('status', filters.status);
  if (filters.riskLevel) params.append('riskLevel', filters.riskLevel);

  const response = await coreApi.get<PaginatedResponse<Pregnancy>>(`/api/v1/pregnancies?${params}`);
  return response.data;
};

// Buscar gestação por ID
export const getPregnancyById = async (id: string): Promise<Pregnancy> => {
  const response = await coreApi.get<Pregnancy>(`/api/v1/pregnancies/${id}`);
  return response.data;
};

// Buscar gestação ativa de uma cidadã
export const getActivePregnancy = async (citizenId: string): Promise<Pregnancy | null> => {
  try {
    const response = await coreApi.get<Pregnancy>(`/api/v1/pregnancies/citizen/${citizenId}/active`);
    return response.data;
  } catch (error: unknown) {
    if ((error as { response?: { status: number } }).response?.status === 404) {
      return null;
    }
    throw error;
  }
};

// Criar nova gestação
export const createPregnancy = async (data: CreatePregnancyDto): Promise<Pregnancy> => {
  const response = await coreApi.post<Pregnancy>('/api/v1/pregnancies', data);
  return response.data;
};

// Atualizar gestação
export const updatePregnancy = async (id: string, data: UpdatePregnancyDto): Promise<Pregnancy> => {
  const response = await coreApi.patch<Pregnancy>(`/api/v1/pregnancies/${id}`, data);
  return response.data;
};

// Finalizar gestação
export const completePregnancy = async (
  id: string,
  data: {
    outcomeDate: string;
    deliveryMethod: 'vaginal' | 'cesarean' | 'forceps' | 'vacuum';
    outcomeNotes?: string;
  }
): Promise<Pregnancy> => {
  const response = await coreApi.post<Pregnancy>(`/api/v1/pregnancies/${id}/complete`, data);
  return response.data;
};

// Obter timeline da gestação
export const getPregnancyTimeline = async (id: string): Promise<Timeline> => {
  const response = await coreApi.get<Timeline>(`/api/v1/pregnancies/${id}/timeline`);
  return response.data;
};

// Adicionar fator de risco
export const addRiskFactor = async (
  id: string,
  riskFactor: {
    code: string;
    display: string;
    severity?: 'low' | 'moderate' | 'high';
  }
): Promise<Pregnancy> => {
  const response = await coreApi.post<Pregnancy>(`/api/v1/pregnancies/${id}/risk-factors`, riskFactor);
  return response.data;
};

// Remover fator de risco
export const removeRiskFactor = async (id: string, code: string): Promise<Pregnancy> => {
  const response = await coreApi.delete<Pregnancy>(`/api/v1/pregnancies/${id}/risk-factors/${code}`);
  return response.data;
};

// Adicionar medicação
export const addMedication = async (
  id: string,
  medication: {
    name: string;
    dose: string;
    frequency: string;
    startDate: string;
  }
): Promise<Pregnancy> => {
  const response = await coreApi.post<Pregnancy>(`/api/v1/pregnancies/${id}/medications`, medication);
  return response.data;
};

// Adicionar vacinação
export const addVaccination = async (
  id: string,
  vaccination: {
    name: string;
    dose: string;
    date: string;
    lot?: string;
  }
): Promise<Pregnancy> => {
  const response = await coreApi.post<Pregnancy>(`/api/v1/pregnancies/${id}/vaccinations`, vaccination);
  return response.data;
};
