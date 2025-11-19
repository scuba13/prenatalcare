// Dataset de Conditions (gestações) - FHIR R4 compatível com RNDS

export const mockConditions = [
  {
    resourceType: 'Condition',
    id: 'condition-001',
    meta: {
      versionId: '1',
      lastUpdated: '2025-11-01T10:30:00Z',
    },
    // Status clínico (obrigatório)
    clinicalStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
        code: 'active',
        display: 'Active',
      }],
    },
    // Status de verificação (obrigatório)
    verificationStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
        code: 'confirmed',
        display: 'Confirmed',
      }],
    },
    // Categoria
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/condition-category',
        code: 'encounter-diagnosis',
        display: 'Encounter Diagnosis',
      }],
    }],
    // Código SNOMED para gestação
    code: {
      coding: [{
        system: 'http://snomed.info/sct',
        code: '77386006',
        display: 'Pregnancy (finding)',
      }],
      text: 'Gestação',
    },
    // Referência ao paciente (obrigatório)
    subject: {
      reference: 'Patient/patient-001',
      display: 'Maria Silva Santos',
    },
    // Data de início (DUM)
    onsetDateTime: '2025-04-01',
    // Data de registro
    recordedDate: '2025-05-15T10:00:00Z',
    // Notas clínicas
    note: [{
      text: 'Gestação de baixo risco. DUM: 01/04/2025. DPP estimada: 06/01/2026 (Regra de Naegele). Idade gestacional atual: ~32 semanas.',
    }],
  },
  {
    resourceType: 'Condition',
    id: 'condition-002',
    meta: {
      versionId: '1',
      lastUpdated: '2025-11-02T10:30:00Z',
    },
    clinicalStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
        code: 'active',
        display: 'Active',
      }],
    },
    verificationStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
        code: 'confirmed',
        display: 'Confirmed',
      }],
    },
    // Categoria com severity (alto risco)
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/condition-category',
        code: 'encounter-diagnosis',
        display: 'Encounter Diagnosis',
      }],
    }],
    severity: {
      coding: [{
        system: 'http://snomed.info/sct',
        code: '24484000',
        display: 'Severe',
      }],
      text: 'Alto risco',
    },
    code: {
      coding: [{
        system: 'http://snomed.info/sct',
        code: '77386006',
        display: 'Pregnancy (finding)',
      }],
      text: 'Gestação de alto risco',
    },
    subject: {
      reference: 'Patient/patient-002',
      display: 'Ana Paula Costa',
    },
    onsetDateTime: '2025-03-15',
    recordedDate: '2025-04-20T10:00:00Z',
    note: [{
      text: 'Gestação de alto risco. Hipertensão arterial crônica controlada com medicação. Acompanhamento quinzenal necessário. DUM: 15/03/2025.',
    }],
    // Evidence - Hipertensão como fator de risco
    evidence: [{
      code: [{
        coding: [{
          system: 'http://snomed.info/sct',
          code: '38341003',
          display: 'Hypertensive disorder',
        }],
        text: 'Hipertensão Arterial Sistêmica',
      }],
    }],
  },
  {
    resourceType: 'Condition',
    id: 'condition-003',
    meta: {
      versionId: '1',
      lastUpdated: '2025-11-03T10:30:00Z',
    },
    clinicalStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
        code: 'active',
        display: 'Active',
      }],
    },
    verificationStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
        code: 'confirmed',
        display: 'Confirmed',
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
        display: 'Pregnancy (finding)',
      }],
      text: 'Gestação',
    },
    subject: {
      reference: 'Patient/patient-003',
      display: 'Juliana Oliveira Lima',
    },
    onsetDateTime: '2025-05-10',
    recordedDate: '2025-06-25T10:00:00Z',
    note: [{
      text: 'Gestação de baixo risco. Primeira gestação (primigesta). DUM: 10/05/2025. Pré-natal iniciado na 6ª semana gestacional.',
    }],
  },
];
