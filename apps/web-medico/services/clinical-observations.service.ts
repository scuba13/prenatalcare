import { coreApi } from '../lib/api';
import type {
  ClinicalObservation,
  CreateClinicalObservationDto,
  ConsultationVitalSigns,
  LOINC_CODES,
} from '../types';

export interface ObservationsFilters {
  citizenId?: string;
  pregnancyId?: string;
  category?: string;
  loincCode?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Listar observações clínicas
export const getObservations = async (filters: ObservationsFilters = {}): Promise<ClinicalObservation[]> => {
  const params = new URLSearchParams();

  if (filters.citizenId) params.append('citizenId', filters.citizenId);
  if (filters.pregnancyId) params.append('pregnancyId', filters.pregnancyId);
  if (filters.category) params.append('category', filters.category);
  if (filters.loincCode) params.append('loincCode', filters.loincCode);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);

  const response = await coreApi.get<ClinicalObservation[]>(`/api/v1/clinical-observations?${params}`);
  return response.data;
};

// Buscar observação por ID
export const getObservationById = async (id: string): Promise<ClinicalObservation> => {
  const response = await coreApi.get<ClinicalObservation>(`/api/v1/clinical-observations/${id}`);
  return response.data;
};

// Criar observação clínica
export const createObservation = async (
  data: CreateClinicalObservationDto
): Promise<ClinicalObservation> => {
  const response = await coreApi.post<ClinicalObservation>('/api/v1/clinical-observations', data);
  return response.data;
};

// Criar múltiplas observações (para registrar sinais vitais de consulta)
export const createBulkObservations = async (
  observations: CreateClinicalObservationDto[]
): Promise<ClinicalObservation[]> => {
  const response = await coreApi.post<ClinicalObservation[]>(
    '/api/v1/clinical-observations/bulk',
    { observations }
  );
  return response.data;
};

// Deletar observação
export const deleteObservation = async (id: string): Promise<void> => {
  await coreApi.delete(`/api/v1/clinical-observations/${id}`);
};

// ==========================================
// Helpers para criar observações de consulta
// ==========================================

// Criar observações de sinais vitais de uma consulta
export const createConsultationVitalSigns = async (
  pregnancyId: string,
  vitalSigns: ConsultationVitalSigns
): Promise<ClinicalObservation[]> => {
  const observations: CreateClinicalObservationDto[] = [];
  const { effectiveDateTime, performer } = vitalSigns;

  // Pressão Arterial (com componentes)
  if (vitalSigns.bloodPressure) {
    observations.push({
      pregnancyId,
      loincCode: '85354-9', // Blood pressure panel
      display: 'Pressão Arterial',
      category: 'vital-signs',
      value: vitalSigns.bloodPressure.systolic, // Valor principal
      unit: 'mmHg',
      effectiveDateTime,
      performer,
      components: [
        {
          loincCode: '8480-6',
          display: 'Pressão Arterial Sistólica',
          value: vitalSigns.bloodPressure.systolic,
          unit: 'mmHg',
        },
        {
          loincCode: '8462-4',
          display: 'Pressão Arterial Diastólica',
          value: vitalSigns.bloodPressure.diastolic,
          unit: 'mmHg',
        },
      ],
    });
  }

  // Peso
  if (vitalSigns.weight) {
    observations.push({
      pregnancyId,
      loincCode: '29463-7',
      display: 'Peso Corporal',
      category: 'vital-signs',
      value: vitalSigns.weight,
      unit: 'kg',
      effectiveDateTime,
      performer,
    });
  }

  // Altura Uterina
  if (vitalSigns.uterineHeight) {
    observations.push({
      pregnancyId,
      loincCode: '11977-6',
      display: 'Altura Uterina',
      category: 'vital-signs',
      value: vitalSigns.uterineHeight,
      unit: 'cm',
      effectiveDateTime,
      performer,
    });
  }

  // Batimentos Cardíacos Fetais
  if (vitalSigns.fetalHeartRate) {
    observations.push({
      pregnancyId,
      loincCode: '55283-6',
      display: 'Batimentos Cardíacos Fetais',
      category: 'vital-signs',
      value: vitalSigns.fetalHeartRate,
      unit: 'bpm',
      effectiveDateTime,
      performer,
    });
  }

  if (observations.length === 0) {
    return [];
  }

  return createBulkObservations(observations);
};

// Buscar última observação de um tipo específico
export const getLatestObservation = async (
  pregnancyId: string,
  loincCode: string
): Promise<ClinicalObservation | null> => {
  try {
    const observations = await getObservations({
      pregnancyId,
      loincCode,
    });

    if (observations.length === 0) return null;

    // Ordenar por data e retornar a mais recente
    return observations.sort(
      (a, b) => new Date(b.effectiveDateTime).getTime() - new Date(a.effectiveDateTime).getTime()
    )[0];
  } catch {
    return null;
  }
};

// Buscar histórico de peso da gestação
export const getWeightHistory = async (pregnancyId: string): Promise<ClinicalObservation[]> => {
  const observations = await getObservations({
    pregnancyId,
    loincCode: '29463-7', // Body weight
  });

  return observations.sort(
    (a, b) => new Date(a.effectiveDateTime).getTime() - new Date(b.effectiveDateTime).getTime()
  );
};

// Buscar histórico de pressão arterial
export const getBloodPressureHistory = async (pregnancyId: string): Promise<ClinicalObservation[]> => {
  const observations = await getObservations({
    pregnancyId,
    loincCode: '85354-9', // Blood pressure panel
  });

  return observations.sort(
    (a, b) => new Date(a.effectiveDateTime).getTime() - new Date(b.effectiveDateTime).getTime()
  );
};
