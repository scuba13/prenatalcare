/**
 * Mappers para converter recursos FHIR da RNDS para entidades de domínio
 * Implementa mapeamento de FHIR R4 → Domínio do Core Service
 */

/**
 * Tipos de domínio (interfaces que refletem as entidades do Core Service)
 * Usamos interfaces ao invés de importar as entidades para evitar dependência circular
 */
export interface CitizenDomain {
  cpf: string;
  cns: string | null;
  fullName: string;
  familyName: string | null;
  givenNames: string[] | null;
  socialName: string | null;
  birthDate: Date;
  gender: 'female' | 'male' | 'other' | 'unknown';
  motherName: string | null;
  fatherName: string | null;
  mobilePhone: string;
  homePhone: string | null;
  email: string | null;
  address: {
    use?: 'home' | 'work' | 'temp' | 'old';
    type?: 'physical' | 'postal' | 'both';
    line: [string, string, string, string];
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  } | null;
}

export interface PregnancyDomain {
  citizenId: string;
  onsetDate: Date;
  expectedDueDate: Date | null;
  status: 'active' | 'completed' | 'cancelled';
  riskLevel: 'low' | 'medium' | 'high';
  pregnancyType: 'singleton' | 'multiple';
  numberOfFetuses: number;
  gestationalWeeks: number | null;
  notes: string | null;
}

export interface ClinicalObservationDomain {
  citizenId: string;
  pregnancyId: string | null;
  loincCode: string;
  display: string;
  category: 'vital-signs' | 'laboratory' | 'exam' | 'procedure' | 'survey' | 'social-history';
  value: number;
  unit: string;
  unitSystem: string | null;
  unitCode: string | null;
  effectiveDateTime: Date;
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error';
  interpretation: 'N' | 'L' | 'H' | 'LL' | 'HH' | 'A' | 'AA' | null;
  referenceRange: {
    low?: number;
    high?: number;
    text?: string;
    appliesTo?: string;
  } | null;
  components: Array<{
    loincCode: string;
    display: string;
    value: number;
    unit: string;
    unitCode?: string;
  }> | null;
  externalId: string | null;
}

/**
 * Mapeia um recurso FHIR Patient para Citizen (domínio)
 * Conforme perfil BRIndividuo-1.0 da RNDS
 */
export function mapPatientToCitizen(fhirPatient: any): Partial<CitizenDomain> {
  // Extrair CPF do identifier
  const cpfIdentifier = fhirPatient.identifier?.find(
    (id: any) => id.system === 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf'
  );

  // Extrair CNS do identifier
  const cnsIdentifier = fhirPatient.identifier?.find(
    (id: any) => id.system === 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns'
  );

  // Extrair nome oficial
  const officialName = fhirPatient.name?.find(
    (n: any) => n.use === 'official' || !n.use
  );

  // Extrair nome social
  const socialName = fhirPatient.name?.find(
    (n: any) => n.use === 'usual'
  );

  // Extrair endereço
  const primaryAddress = fhirPatient.address?.[0];

  // Extrair telefones
  const mobileTelecom = fhirPatient.telecom?.find(
    (t: any) => t.system === 'phone' && t.use === 'mobile'
  );
  const homeTelecom = fhirPatient.telecom?.find(
    (t: any) => t.system === 'phone' && (t.use === 'home' || !t.use)
  );
  const emailTelecom = fhirPatient.telecom?.find(
    (t: any) => t.system === 'email'
  );

  // Extrair nome da mãe da extension
  const motherNameExtension = fhirPatient.extension?.find(
    (ext: any) => ext.url === 'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName'
  );

  return {
    cpf: cpfIdentifier?.value || '',
    cns: cnsIdentifier?.value || null,
    fullName: officialName?.text || [
      ...(officialName?.given || []),
      officialName?.family
    ].filter(Boolean).join(' '),
    familyName: officialName?.family || null,
    givenNames: officialName?.given || null,
    socialName: socialName?.text || null,
    birthDate: fhirPatient.birthDate ? new Date(fhirPatient.birthDate) : new Date(),
    gender: mapGender(fhirPatient.gender),
    motherName: motherNameExtension?.valueString || null,
    fatherName: null, // FHIR Patient não tem campo padrão para pai
    mobilePhone: mobileTelecom?.value ? cleanPhone(mobileTelecom.value) : '',
    homePhone: homeTelecom?.value ? cleanPhone(homeTelecom.value) : null,
    email: emailTelecom?.value || null,
    address: primaryAddress ? {
      use: primaryAddress.use || 'home',
      type: primaryAddress.type || 'physical',
      line: [
        primaryAddress.line?.[0] || '', // Rua
        primaryAddress.line?.[1] || '', // Número
        primaryAddress.line?.[2] || '', // Complemento
        primaryAddress.line?.[3] || '', // Bairro
      ] as [string, string, string, string],
      city: primaryAddress.city || '',
      state: primaryAddress.state || '',
      postalCode: primaryAddress.postalCode ? cleanPostalCode(primaryAddress.postalCode) : '',
      country: primaryAddress.country || 'BRA',
    } : null,
  };
}

/**
 * Mapeia um recurso FHIR Condition (gravidez) para Pregnancy (domínio)
 * Usa code.coding com SNOMED CT 77386006 (Pregnancy)
 */
export function mapConditionToPregnancy(
  fhirCondition: any,
  citizenId: string
): Partial<PregnancyDomain> {
  // Extrair data prevista do parto da extension
  const dueDateExtension = fhirCondition.extension?.find(
    (ext: any) => ext.url === 'http://hl7.org/fhir/StructureDefinition/condition-dueTo'
  );

  // Calcular semanas gestacionais baseado em onsetDateTime
  const onsetDate = fhirCondition.onsetDateTime
    ? new Date(fhirCondition.onsetDateTime)
    : new Date();

  const gestationalWeeks = calculateGestationalWeeks(onsetDate);

  return {
    citizenId,
    onsetDate,
    expectedDueDate: dueDateExtension?.valueDateTime
      ? new Date(dueDateExtension.valueDateTime)
      : calculateDueDate(onsetDate),
    status: mapConditionStatus(fhirCondition.clinicalStatus?.coding?.[0]?.code),
    riskLevel: 'low', // Precisa ser inferido de outras observações
    pregnancyType: 'singleton', // Precisa ser inferido
    numberOfFetuses: 1,
    gestationalWeeks,
    notes: fhirCondition.note?.[0]?.text || null,
  };
}

/**
 * Mapeia um recurso FHIR Observation para ClinicalObservation (domínio)
 */
export function mapObservationToClinicalObservation(
  fhirObservation: any,
  citizenId: string,
  pregnancyId: string | null = null
): Partial<ClinicalObservationDomain> {
  // Extrair código LOINC
  const loincCoding = fhirObservation.code?.coding?.find(
    (c: any) => c.system === 'http://loinc.org'
  );

  // Extrair valor (pode ser valueQuantity, valueString, valueCodeableConcept, etc.)
  const value = fhirObservation.valueQuantity?.value || 0;
  const unit = fhirObservation.valueQuantity?.unit || '';
  const unitCode = fhirObservation.valueQuantity?.code || null;

  // Extrair categoria
  const categoryCoding = fhirObservation.category?.[0]?.coding?.[0];

  // Extrair interpretação
  const interpretationCoding = fhirObservation.interpretation?.[0]?.coding?.[0];

  // Extrair reference range
  const referenceRange = fhirObservation.referenceRange?.[0];

  // Extrair componentes (para observações compostas como pressão arterial)
  const components = fhirObservation.component?.map((comp: any) => {
    const compLoincCoding = comp.code?.coding?.find(
      (c: any) => c.system === 'http://loinc.org'
    );

    return {
      loincCode: compLoincCoding?.code || '',
      display: compLoincCoding?.display || comp.code?.text || '',
      value: comp.valueQuantity?.value || 0,
      unit: comp.valueQuantity?.unit || '',
      unitCode: comp.valueQuantity?.code || undefined,
    };
  }) || null;

  return {
    citizenId,
    pregnancyId,
    loincCode: loincCoding?.code || '',
    display: loincCoding?.display || fhirObservation.code?.text || '',
    category: mapObservationCategory(categoryCoding?.code),
    value,
    unit,
    unitSystem: fhirObservation.valueQuantity?.system || null,
    unitCode,
    effectiveDateTime: fhirObservation.effectiveDateTime
      ? new Date(fhirObservation.effectiveDateTime)
      : new Date(),
    status: mapObservationStatus(fhirObservation.status),
    interpretation: mapInterpretation(interpretationCoding?.code),
    referenceRange: referenceRange ? {
      low: referenceRange.low?.value || undefined,
      high: referenceRange.high?.value || undefined,
      text: referenceRange.text || undefined,
      appliesTo: referenceRange.appliesTo?.[0]?.text || undefined,
    } : null,
    components,
    externalId: fhirObservation.id || null,
  };
}

// Helper functions

function mapGender(fhirGender: string): 'female' | 'male' | 'other' | 'unknown' {
  const genderMap: Record<string, 'female' | 'male' | 'other' | 'unknown'> = {
    female: 'female',
    male: 'male',
    other: 'other',
    unknown: 'unknown',
  };
  return genderMap[fhirGender] || 'unknown';
}

function mapConditionStatus(fhirStatus: string): 'active' | 'completed' | 'cancelled' {
  if (fhirStatus === 'active' || fhirStatus === 'recurrence') return 'active';
  if (fhirStatus === 'resolved' || fhirStatus === 'inactive') return 'completed';
  if (fhirStatus === 'remission') return 'completed';
  return 'cancelled';
}

function mapObservationCategory(
  categoryCode: string
): 'vital-signs' | 'laboratory' | 'exam' | 'procedure' | 'survey' | 'social-history' {
  const categoryMap: Record<string, any> = {
    'vital-signs': 'vital-signs',
    'laboratory': 'laboratory',
    'exam': 'exam',
    'procedure': 'procedure',
    'survey': 'survey',
    'social-history': 'social-history',
  };
  return categoryMap[categoryCode] || 'vital-signs';
}

function mapObservationStatus(
  fhirStatus: string
): 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' {
  const statusMap: Record<string, any> = {
    registered: 'registered',
    preliminary: 'preliminary',
    final: 'final',
    amended: 'amended',
    corrected: 'corrected',
    cancelled: 'cancelled',
    'entered-in-error': 'entered-in-error',
  };
  return statusMap[fhirStatus] || 'final';
}

function mapInterpretation(interpretationCode: string): 'N' | 'L' | 'H' | 'LL' | 'HH' | 'A' | 'AA' | null {
  const interpretationMap: Record<string, 'N' | 'L' | 'H' | 'LL' | 'HH' | 'A' | 'AA'> = {
    N: 'N',
    L: 'L',
    H: 'H',
    LL: 'LL',
    HH: 'HH',
    A: 'A',
    AA: 'AA',
  };
  return interpretationMap[interpretationCode] || null;
}

function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function cleanPostalCode(postalCode: string): string {
  return postalCode.replace(/\D/g, '');
}

function calculateGestationalWeeks(onsetDate: Date): number {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - onsetDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7);
}

function calculateDueDate(onsetDate: Date): Date {
  const dueDate = new Date(onsetDate);
  dueDate.setDate(dueDate.getDate() + 280); // 40 semanas
  return dueDate;
}
