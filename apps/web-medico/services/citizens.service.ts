import { coreApi, rndsApi } from '../lib/api';
import type {
  Citizen,
  CreateCitizenDto,
  UpdateCitizenDto,
  RNDSPatientData,
  PaginatedResponse,
} from '../types';

export interface CitizensFilters {
  page?: number;
  limit?: number;
  search?: string;
  riskLevel?: 'habitual' | 'intermediario' | 'alto';
  trimester?: 1 | 2 | 3;
  active?: boolean;
}

// Listar cidadãs (gestantes)
export const getCitizens = async (filters: CitizensFilters = {}): Promise<PaginatedResponse<Citizen>> => {
  const params = new URLSearchParams();

  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.search) params.append('search', filters.search);
  if (filters.riskLevel) params.append('riskLevel', filters.riskLevel);
  if (filters.trimester) params.append('trimester', filters.trimester.toString());
  if (filters.active !== undefined) params.append('active', filters.active.toString());

  const response = await coreApi.get<PaginatedResponse<Citizen>>(`/api/v1/citizens?${params}`);
  return response.data;
};

// Buscar cidadã por ID
export const getCitizenById = async (id: string): Promise<Citizen> => {
  const response = await coreApi.get<Citizen>(`/api/v1/citizens/${id}`);
  return response.data;
};

// Buscar cidadã por CPF
export const getCitizenByCpf = async (cpf: string): Promise<Citizen | null> => {
  try {
    const response = await coreApi.get<Citizen>(`/api/v1/citizens/cpf/${cpf}`);
    return response.data;
  } catch (error: unknown) {
    if ((error as { response?: { status: number } }).response?.status === 404) {
      return null;
    }
    throw error;
  }
};

// Criar nova cidadã
export const createCitizen = async (data: CreateCitizenDto): Promise<Citizen> => {
  const response = await coreApi.post<Citizen>('/api/v1/citizens', data);
  return response.data;
};

// Atualizar cidadã
export const updateCitizen = async (id: string, data: UpdateCitizenDto): Promise<Citizen> => {
  const response = await coreApi.patch<Citizen>(`/api/v1/citizens/${id}`, data);
  return response.data;
};

// Deletar cidadã (soft delete)
export const deleteCitizen = async (id: string): Promise<void> => {
  await coreApi.delete(`/api/v1/citizens/${id}`);
};

// Anonimizar cidadã (LGPD)
export const anonymizeCitizen = async (id: string, reason: string): Promise<void> => {
  await coreApi.post(`/api/v1/citizens/${id}/anonymize`, { reason });
};

// ==========================================
// Integração RNDS - Buscar dados do paciente
// ==========================================

export interface RNDSSyncResult {
  found: boolean;
  patient?: RNDSPatientData;
  message?: string;
}

// Buscar dados do paciente na RNDS pelo CPF
export const searchPatientInRNDS = async (cpf: string): Promise<RNDSSyncResult> => {
  try {
    // Chama o RNDS Service que faz a busca na RNDS
    const response = await rndsApi.post<RNDSSyncResult>('/sync/patient/' + cpf);
    return response.data;
  } catch (error: unknown) {
    const err = error as { response?: { status: number; data?: { message?: string } } };
    if (err.response?.status === 404) {
      return {
        found: false,
        message: 'Paciente não encontrado na RNDS',
      };
    }
    throw error;
  }
};

// Buscar dados completos do paciente na RNDS (Patient + Conditions + Observations)
export const syncPatientFromRNDS = async (cpf: string): Promise<RNDSSyncResult> => {
  try {
    const response = await rndsApi.post<RNDSSyncResult>(`/sync/patient/${cpf}/complete`);
    return response.data;
  } catch (error: unknown) {
    const err = error as { response?: { status: number; data?: { message?: string } } };
    if (err.response?.status === 404) {
      return {
        found: false,
        message: 'Paciente não encontrado na RNDS',
      };
    }
    throw error;
  }
};

// Contar gestantes por nível de risco
export const getPatientStats = async (): Promise<{
  total: number;
  habitual: number;
  intermediario: number;
  alto: number;
}> => {
  const response = await coreApi.get('/api/v1/citizens/stats');
  return response.data;
};
