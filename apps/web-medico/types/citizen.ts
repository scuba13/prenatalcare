export interface Address {
  use?: 'home' | 'work' | 'temp' | 'old';
  type?: 'physical' | 'postal' | 'both';
  line: [string, string, string, string]; // [rua, numero, complemento, bairro]
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type Gender = 'female' | 'male' | 'other' | 'unknown';

export interface Citizen {
  id: string;
  cpf: string;
  cns?: string;
  fullName: string;
  familyName?: string;
  givenNames?: string[];
  socialName?: string;
  birthDate: string;
  gender: Gender;
  motherName?: string;
  fatherName?: string;
  mobilePhone: string;
  homePhone?: string;
  email?: string;
  address?: Address;
  bloodType?: BloodType;
  allergies: string[];
  chronicConditions: string[];
  active: boolean;
  lastAccessAt?: string;
  dataAnonymizationReason?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateCitizenDto {
  cpf: string;
  cns?: string;
  fullName: string;
  familyName?: string;
  givenNames?: string[];
  socialName?: string;
  birthDate: string;
  gender?: Gender;
  motherName?: string;
  fatherName?: string;
  mobilePhone: string;
  homePhone?: string;
  email?: string;
  address?: Address;
  bloodType?: BloodType;
  allergies?: string[];
  chronicConditions?: string[];
}

export interface UpdateCitizenDto extends Partial<CreateCitizenDto> {}

// Dados retornados pela RNDS
export interface RNDSPatientData {
  cpf: string;
  cns?: string;
  fullName: string;
  familyName?: string;
  givenNames?: string[];
  birthDate: string;
  gender: Gender;
  motherName?: string;
  address?: Address;
  // Outros campos que a RNDS pode retornar
}
