export type PregnancyStatus = 'active' | 'completed' | 'terminated';

export type RiskLevel = 'habitual' | 'intermediario' | 'alto';

export type PregnancyType = 'singleton' | 'twin' | 'triplet' | 'multiple';

export type DeliveryMethod = 'vaginal' | 'cesarean' | 'forceps' | 'vacuum';

export interface RiskFactor {
  code: string;
  display: string;
  severity?: 'low' | 'moderate' | 'high';
  detectedAt: string;
}

export interface Medication {
  name: string;
  dose: string;
  frequency: string;
  startDate: string;
  endDate?: string;
}

export interface Vaccination {
  name: string;
  dose: string;
  date: string;
  lot?: string;
}

export interface Pregnancy {
  id: string;
  citizenId: string;
  lastMenstrualPeriod: string; // DUM
  estimatedDueDate: string; // DPP
  gestationalWeeks: number;
  gestationalDays: number;
  status: PregnancyStatus;
  gravida: number; // G - número de gestações
  para: number; // P - partos
  cesarean: number; // C - cesáreas
  abortions: number; // A - abortos
  liveBirths: number;
  riskLevel: RiskLevel;
  riskFactors: RiskFactor[];
  pregnancyType: PregnancyType;
  outcomeDate?: string;
  deliveryMethod?: DeliveryMethod;
  outcomeNotes?: string;
  prePregnancyWeight?: number;
  height?: number;
  medications: Medication[];
  vaccinations: Vaccination[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreatePregnancyDto {
  citizenId: string;
  lastMenstrualPeriod: string;
  gravida?: number;
  para?: number;
  cesarean?: number;
  abortions?: number;
  liveBirths?: number;
  riskLevel?: RiskLevel;
  riskFactors?: RiskFactor[];
  pregnancyType?: PregnancyType;
  prePregnancyWeight?: number;
  height?: number;
  medications?: Medication[];
  vaccinations?: Vaccination[];
}

export interface UpdatePregnancyDto extends Partial<CreatePregnancyDto> {
  status?: PregnancyStatus;
  outcomeDate?: string;
  deliveryMethod?: DeliveryMethod;
  outcomeNotes?: string;
}

// Tipo combinado para exibição
export interface CitizenWithPregnancy {
  citizen: import('./citizen').Citizen;
  pregnancy: Pregnancy;
}
