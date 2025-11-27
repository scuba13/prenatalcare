export type ObservationCategory =
  | 'vital-signs'
  | 'laboratory'
  | 'exam'
  | 'procedure'
  | 'survey'
  | 'social-history';

export type ObservationStatus =
  | 'registered'
  | 'preliminary'
  | 'final'
  | 'amended'
  | 'corrected'
  | 'cancelled'
  | 'entered-in-error';

export type Interpretation = 'N' | 'L' | 'H' | 'LL' | 'HH' | 'A' | 'AA';

export interface ReferenceRange {
  low?: number;
  high?: number;
  text?: string;
  appliesTo?: string;
}

export interface ObservationComponent {
  loincCode: string;
  display: string;
  value: number;
  unit: string;
  unitCode?: string;
}

export interface ClinicalObservation {
  id: string;
  citizenId?: string;
  pregnancyId?: string;
  loincCode: string;
  display: string;
  category: ObservationCategory;
  value: number;
  unit: string;
  unitSystem?: string;
  unitCode?: string;
  effectiveDateTime: string;
  status: ObservationStatus;
  interpretation?: Interpretation;
  referenceRange?: ReferenceRange;
  components?: ObservationComponent[];
  method?: string;
  bodySite?: string;
  performer?: string;
  note?: string;
  externalId?: string;
  lastSyncedAt?: string;
  syncedToRnds: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateClinicalObservationDto {
  citizenId?: string;
  pregnancyId?: string;
  loincCode: string;
  display: string;
  category: ObservationCategory;
  value: number;
  unit: string;
  unitSystem?: string;
  unitCode?: string;
  effectiveDateTime: string;
  status?: ObservationStatus;
  interpretation?: Interpretation;
  referenceRange?: ReferenceRange;
  components?: ObservationComponent[];
  method?: string;
  bodySite?: string;
  performer?: string;
  note?: string;
}

// Códigos LOINC comuns para pré-natal
export const LOINC_CODES = {
  // Sinais Vitais
  BLOOD_PRESSURE_SYSTOLIC: '8480-6',
  BLOOD_PRESSURE_DIASTOLIC: '8462-4',
  BODY_WEIGHT: '29463-7',
  BODY_HEIGHT: '8302-2',

  // Obstétricos
  UTERINE_HEIGHT: '11977-6',
  FETAL_HEART_RATE: '55283-6',
  GESTATIONAL_AGE: '49051-6',
  LAST_MENSTRUAL_PERIOD: '8665-2',
  ESTIMATED_DUE_DATE: '11778-8',

  // Laboratoriais
  HEMOGLOBIN: '718-7',
  HEMATOCRIT: '4544-3',
  GLUCOSE_FASTING: '1558-6',
  VDRL: '5292-8',
  HIV: '5018-7',
} as const;

// Helper para criar observação de pressão arterial
export interface BloodPressureReading {
  systolic: number;
  diastolic: number;
  effectiveDateTime: string;
  method?: string;
  performer?: string;
  note?: string;
}

// Helper para criar observação de sinais vitais de consulta
export interface ConsultationVitalSigns {
  bloodPressure?: { systolic: number; diastolic: number };
  weight?: number;
  uterineHeight?: number;
  fetalHeartRate?: number;
  edema?: 'absent' | 'mild' | 'moderate' | 'severe';
  effectiveDateTime: string;
  performer?: string;
}
