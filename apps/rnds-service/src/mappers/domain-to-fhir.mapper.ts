/**
 * Mappers para converter entidades de domínio para recursos FHIR da RNDS
 * Implementa mapeamento de Domínio do Core Service → FHIR R4
 * Conforme perfis BR da RNDS (BRIndividuo-1.0, etc.)
 */

import { CitizenDomain, PregnancyDomain, ClinicalObservationDomain } from './fhir-to-domain.mapper';

/**
 * Mapeia Citizen (domínio) para FHIR Patient
 * Conforme perfil BRIndividuo-1.0 da RNDS
 */
export function mapCitizenToPatient(citizen: CitizenDomain): any {
  const patient: any = {
    resourceType: 'Patient',
    meta: {
      profile: ['http://www.saude.gov.br/fhir/r4/StructureDefinition/BRIndividuo-1.0'],
    },
    identifier: [],
    name: [],
    telecom: [],
    gender: citizen.gender,
    birthDate: formatDate(citizen.birthDate),
  };

  // Adicionar CPF (obrigatório)
  if (citizen.cpf) {
    patient.identifier.push({
      use: 'official',
      system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf',
      value: citizen.cpf,
    });
  }

  // Adicionar CNS se disponível
  if (citizen.cns) {
    patient.identifier.push({
      use: 'official',
      system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns',
      value: citizen.cns,
    });
  }

  // Nome oficial
  const officialName: any = {
    use: 'official',
    family: citizen.familyName || extractFamilyName(citizen.fullName),
    given: citizen.givenNames || extractGivenNames(citizen.fullName),
  };

  // Adicionar texto completo
  officialName.text = citizen.fullName;

  patient.name.push(officialName);

  // Nome social (se disponível)
  if (citizen.socialName) {
    patient.name.push({
      use: 'usual',
      text: citizen.socialName,
    });
  }

  // Telefone celular (obrigatório)
  if (citizen.mobilePhone) {
    patient.telecom.push({
      system: 'phone',
      value: formatPhone(citizen.mobilePhone),
      use: 'mobile',
    });
  }

  // Telefone residencial
  if (citizen.homePhone) {
    patient.telecom.push({
      system: 'phone',
      value: formatPhone(citizen.homePhone),
      use: 'home',
    });
  }

  // Email
  if (citizen.email) {
    patient.telecom.push({
      system: 'email',
      value: citizen.email,
    });
  }

  // Endereço conforme BREndereco
  if (citizen.address) {
    patient.address = [{
      use: citizen.address.use || 'home',
      type: citizen.address.type || 'physical',
      line: citizen.address.line,
      city: citizen.address.city,
      state: citizen.address.state,
      postalCode: formatPostalCode(citizen.address.postalCode),
      country: citizen.address.country || 'BRA',
    }];
  }

  // Nome da mãe (extension)
  if (citizen.motherName) {
    patient.extension = patient.extension || [];
    patient.extension.push({
      url: 'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName',
      valueString: citizen.motherName,
    });
  }

  return patient;
}

/**
 * Mapeia Pregnancy (domínio) para FHIR Condition
 * Usa SNOMED CT 77386006 (Pregnancy)
 */
export function mapPregnancyToCondition(pregnancy: PregnancyDomain): any {
  const condition: any = {
    resourceType: 'Condition',
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/Condition'],
    },
    clinicalStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
        code: mapPregnancyStatusToFhir(pregnancy.status),
      }],
    },
    verificationStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
        code: 'confirmed',
      }],
    },
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/condition-category',
        code: 'encounter-diagnosis',
        display: 'Encounter Diagnosis',
      }],
    }],
    code: {
      coding: [{
        system: 'http://snomed.info/sct',
        code: '77386006',
        display: 'Pregnancy',
      }],
      text: 'Gravidez',
    },
    subject: {
      reference: `Patient/${pregnancy.citizenId}`,
    },
    onsetDateTime: pregnancy.onsetDate.toISOString(),
    note: pregnancy.notes ? [{
      text: pregnancy.notes,
    }] : undefined,
  };

  // Adicionar data prevista do parto como extension
  if (pregnancy.expectedDueDate) {
    condition.extension = [{
      url: 'http://hl7.org/fhir/StructureDefinition/condition-dueTo',
      valueDateTime: pregnancy.expectedDueDate.toISOString(),
    }];
  }

  return condition;
}

/**
 * Mapeia Pregnancy + Tasks para FHIR CarePlan
 * Representa o plano de cuidado pré-natal
 */
export function mapPregnancyToCarePlan(pregnancy: PregnancyDomain, tasks?: any[]): any {
  const carePlan: any = {
    resourceType: 'CarePlan',
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/CarePlan'],
    },
    status: pregnancy.status === 'active' ? 'active' : 'completed',
    intent: 'plan',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/careplan-category',
        code: 'assess-plan',
        display: 'Assessment and Plan of Treatment',
      }],
      text: 'Plano de Pré-Natal',
    }],
    title: 'Plano de Cuidado Pré-Natal',
    description: `Gestação iniciada em ${formatDate(pregnancy.onsetDate)}. ` +
      `Semanas gestacionais: ${pregnancy.gestationalWeeks || 0}. ` +
      `Risco: ${pregnancy.riskLevel}`,
    subject: {
      reference: `Patient/${pregnancy.citizenId}`,
    },
    period: {
      start: pregnancy.onsetDate.toISOString(),
      end: pregnancy.expectedDueDate?.toISOString(),
    },
    addresses: [{
      reference: `Condition/pregnancy-${pregnancy.citizenId}`,
    }],
  };

  // Adicionar atividades (tasks) se disponíveis
  if (tasks && tasks.length > 0) {
    carePlan.activity = tasks.map((task) => ({
      detail: {
        kind: 'Task',
        code: {
          text: task.title,
        },
        status: mapTaskStatus(task.status),
        scheduledTiming: task.dueDate ? {
          event: [task.dueDate.toISOString()],
        } : undefined,
        description: task.description,
      },
    }));
  }

  return carePlan;
}

/**
 * Mapeia ClinicalObservation (domínio) para FHIR Observation
 */
export function mapClinicalObservationToObservation(
  observation: ClinicalObservationDomain
): any {
  const fhirObservation: any = {
    resourceType: 'Observation',
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/Observation'],
    },
    status: observation.status,
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
        code: observation.category,
      }],
    }],
    code: {
      coding: [{
        system: 'http://loinc.org',
        code: observation.loincCode,
        display: observation.display,
      }],
      text: observation.display,
    },
    subject: {
      reference: `Patient/${observation.citizenId}`,
    },
    effectiveDateTime: observation.effectiveDateTime.toISOString(),
    valueQuantity: {
      value: observation.value,
      unit: observation.unit,
      system: observation.unitSystem || 'http://unitsofmeasure.org',
      code: observation.unitCode || observation.unit,
    },
  };

  // Adicionar interpretação se disponível
  if (observation.interpretation) {
    fhirObservation.interpretation = [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
        code: observation.interpretation,
      }],
    }];
  }

  // Adicionar reference range se disponível
  if (observation.referenceRange) {
    fhirObservation.referenceRange = [{
      low: observation.referenceRange.low ? {
        value: observation.referenceRange.low,
        unit: observation.unit,
      } : undefined,
      high: observation.referenceRange.high ? {
        value: observation.referenceRange.high,
        unit: observation.unit,
      } : undefined,
      text: observation.referenceRange.text,
    }];
  }

  // Adicionar componentes (para observações compostas)
  if (observation.components && observation.components.length > 0) {
    fhirObservation.component = observation.components.map((comp) => ({
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: comp.loincCode,
          display: comp.display,
        }],
      },
      valueQuantity: {
        value: comp.value,
        unit: comp.unit,
        system: 'http://unitsofmeasure.org',
        code: comp.unitCode || comp.unit,
      },
    }));
  }

  // Adicionar ID externo se disponível
  if (observation.externalId) {
    fhirObservation.id = observation.externalId;
  }

  return fhirObservation;
}

/**
 * Cria um Bundle FHIR para envio em lote para RNDS
 * Tipo: transaction (tudo ou nada)
 */
export function createTransactionBundle(resources: any[]): any {
  return {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: resources.map((resource) => ({
      fullUrl: `urn:uuid:${generateUuid()}`,
      resource,
      request: {
        method: resource.id ? 'PUT' : 'POST',
        url: resource.id
          ? `${resource.resourceType}/${resource.id}`
          : resource.resourceType,
      },
    })),
  };
}

/**
 * Cria um Bundle FHIR tipo batch (processamento independente)
 */
export function createBatchBundle(resources: any[]): any {
  return {
    resourceType: 'Bundle',
    type: 'batch',
    entry: resources.map((resource) => ({
      fullUrl: `urn:uuid:${generateUuid()}`,
      resource,
      request: {
        method: resource.id ? 'PUT' : 'POST',
        url: resource.id
          ? `${resource.resourceType}/${resource.id}`
          : resource.resourceType,
      },
    })),
  };
}

// Helper functions

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatPhone(phone: string): string {
  // Remove não-dígitos
  const clean = phone.replace(/\D/g, '');

  // Formata como +55 (XX) XXXXX-XXXX ou +55 (XX) XXXX-XXXX
  if (clean.length === 11) {
    return `+55 (${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  } else if (clean.length === 10) {
    return `+55 (${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }

  return `+55 ${clean}`;
}

function formatPostalCode(postalCode: string): string {
  const clean = postalCode.replace(/\D/g, '');
  return clean.length === 8 ? `${clean.slice(0, 5)}-${clean.slice(5)}` : clean;
}

function extractFamilyName(fullName: string): string {
  const parts = fullName.trim().split(' ');
  return parts[parts.length - 1];
}

function extractGivenNames(fullName: string): string[] {
  const parts = fullName.trim().split(' ');
  return parts.slice(0, -1);
}

function mapPregnancyStatusToFhir(status: 'active' | 'completed' | 'cancelled'): string {
  const statusMap: Record<string, string> = {
    active: 'active',
    completed: 'resolved',
    cancelled: 'inactive',
  };
  return statusMap[status] || 'active';
}

function mapTaskStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'not-started',
    'in-progress': 'in-progress',
    completed: 'completed',
    cancelled: 'cancelled',
    overdue: 'on-hold',
  };
  return statusMap[status] || 'not-started';
}

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
