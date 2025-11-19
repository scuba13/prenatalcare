// Dataset de Observations (peso, pressão, exames) - FHIR R4 com códigos LOINC corretos

export const mockObservations = [
  // Peso - Patient 001
  {
    resourceType: 'Observation',
    id: 'obs-001',
    meta: {
      versionId: '1',
      lastUpdated: '2025-11-01T11:00:00Z',
    },
    // Status obrigatório
    status: 'final',
    // Categoria obrigatória
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
        code: 'vital-signs',
        display: 'Vital Signs',
      }],
    }],
    // Código LOINC para peso
    code: {
      coding: [{
        system: 'http://loinc.org',
        code: '29463-7',
        display: 'Body weight',
      }],
      text: 'Peso corporal',
    },
    // Referência ao paciente (obrigatório)
    subject: {
      reference: 'Patient/patient-001',
      display: 'Maria Silva Santos',
    },
    // Data/hora da medição (obrigatório)
    effectiveDateTime: '2025-11-01T10:00:00Z',
    // Valor com unidade
    valueQuantity: {
      value: 68.5,
      unit: 'kg',
      system: 'http://unitsofmeasure.org',
      code: 'kg',
    },
  },

  // Pressão arterial - Patient 001
  {
    resourceType: 'Observation',
    id: 'obs-002',
    meta: {
      versionId: '1',
      lastUpdated: '2025-11-01T11:05:00Z',
    },
    status: 'final',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
        code: 'vital-signs',
        display: 'Vital Signs',
      }],
    }],
    // Código LOINC para painel de pressão arterial
    code: {
      coding: [{
        system: 'http://loinc.org',
        code: '85354-9',
        display: 'Blood pressure panel with all children optional',
      }],
      text: 'Pressão arterial',
    },
    subject: {
      reference: 'Patient/patient-001',
      display: 'Maria Silva Santos',
    },
    effectiveDateTime: '2025-11-01T10:00:00Z',
    // Components para sistólica e diastólica
    component: [
      {
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '8480-6',
            display: 'Systolic blood pressure',
          }],
          text: 'Pressão sistólica',
        },
        valueQuantity: {
          value: 120,
          unit: 'mmHg',
          system: 'http://unitsofmeasure.org',
          code: 'mm[Hg]',
        },
      },
      {
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '8462-4',
            display: 'Diastolic blood pressure',
          }],
          text: 'Pressão diastólica',
        },
        valueQuantity: {
          value: 80,
          unit: 'mmHg',
          system: 'http://unitsofmeasure.org',
          code: 'mm[Hg]',
        },
      },
    ],
  },

  // Hemoglobina - Patient 001
  {
    resourceType: 'Observation',
    id: 'obs-003',
    meta: {
      versionId: '1',
      lastUpdated: '2025-11-01T11:10:00Z',
    },
    status: 'final',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
        code: 'laboratory',
        display: 'Laboratory',
      }],
    }],
    // Código LOINC para hemoglobina
    code: {
      coding: [{
        system: 'http://loinc.org',
        code: '718-7',
        display: 'Hemoglobin [Mass/volume] in Blood',
      }],
      text: 'Hemoglobina',
    },
    subject: {
      reference: 'Patient/patient-001',
      display: 'Maria Silva Santos',
    },
    effectiveDateTime: '2025-11-01T09:00:00Z',
    valueQuantity: {
      value: 12.5,
      unit: 'g/dL',
      system: 'http://unitsofmeasure.org',
      code: 'g/dL',
    },
    // Interpretação
    interpretation: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
        code: 'N',
        display: 'Normal',
      }],
    }],
    // Valores de referência
    referenceRange: [{
      low: {
        value: 12.0,
        unit: 'g/dL',
        system: 'http://unitsofmeasure.org',
        code: 'g/dL',
      },
      high: {
        value: 16.0,
        unit: 'g/dL',
        system: 'http://unitsofmeasure.org',
        code: 'g/dL',
      },
      text: 'Valores de referência para gestantes',
    }],
  },

  // Glicemia de jejum - Patient 001
  {
    resourceType: 'Observation',
    id: 'obs-006',
    meta: {
      versionId: '1',
      lastUpdated: '2025-11-01T11:15:00Z',
    },
    status: 'final',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
        code: 'laboratory',
        display: 'Laboratory',
      }],
    }],
    code: {
      coding: [{
        system: 'http://loinc.org',
        code: '1558-6',
        display: 'Fasting glucose [Mass/volume] in Serum or Plasma',
      }],
      text: 'Glicemia de jejum',
    },
    subject: {
      reference: 'Patient/patient-001',
      display: 'Maria Silva Santos',
    },
    effectiveDateTime: '2025-11-01T08:00:00Z',
    valueQuantity: {
      value: 89,
      unit: 'mg/dL',
      system: 'http://unitsofmeasure.org',
      code: 'mg/dL',
    },
    interpretation: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
        code: 'N',
        display: 'Normal',
      }],
    }],
    referenceRange: [{
      high: {
        value: 92,
        unit: 'mg/dL',
        system: 'http://unitsofmeasure.org',
        code: 'mg/dL',
      },
      text: 'Referência para diagnóstico de diabetes gestacional',
    }],
  },

  // Peso - Patient 002
  {
    resourceType: 'Observation',
    id: 'obs-004',
    meta: {
      versionId: '1',
      lastUpdated: '2025-11-02T11:00:00Z',
    },
    status: 'final',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
        code: 'vital-signs',
        display: 'Vital Signs',
      }],
    }],
    code: {
      coding: [{
        system: 'http://loinc.org',
        code: '29463-7',
        display: 'Body weight',
      }],
      text: 'Peso corporal',
    },
    subject: {
      reference: 'Patient/patient-002',
      display: 'Ana Paula Costa',
    },
    effectiveDateTime: '2025-11-02T10:00:00Z',
    valueQuantity: {
      value: 75.2,
      unit: 'kg',
      system: 'http://unitsofmeasure.org',
      code: 'kg',
    },
  },

  // Pressão arterial - Patient 002 (elevada - alto risco)
  {
    resourceType: 'Observation',
    id: 'obs-005',
    meta: {
      versionId: '1',
      lastUpdated: '2025-11-02T11:05:00Z',
    },
    status: 'final',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
        code: 'vital-signs',
        display: 'Vital Signs',
      }],
    }],
    code: {
      coding: [{
        system: 'http://loinc.org',
        code: '85354-9',
        display: 'Blood pressure panel with all children optional',
      }],
      text: 'Pressão arterial',
    },
    subject: {
      reference: 'Patient/patient-002',
      display: 'Ana Paula Costa',
    },
    effectiveDateTime: '2025-11-02T10:00:00Z',
    component: [
      {
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '8480-6',
            display: 'Systolic blood pressure',
          }],
          text: 'Pressão sistólica',
        },
        valueQuantity: {
          value: 140,
          unit: 'mmHg',
          system: 'http://unitsofmeasure.org',
          code: 'mm[Hg]',
        },
      },
      {
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '8462-4',
            display: 'Diastolic blood pressure',
          }],
          text: 'Pressão diastólica',
        },
        valueQuantity: {
          value: 90,
          unit: 'mmHg',
          system: 'http://unitsofmeasure.org',
          code: 'mm[Hg]',
        },
      },
    ],
    interpretation: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
        code: 'H',
        display: 'High',
      }],
      text: 'Pressão elevada - monitorar hipertensão gestacional',
    }],
  },

  // Altura uterina - Patient 001 (específico pré-natal)
  {
    resourceType: 'Observation',
    id: 'obs-007',
    meta: {
      versionId: '1',
      lastUpdated: '2025-11-01T11:20:00Z',
    },
    status: 'final',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
        code: 'exam',
        display: 'Exam',
      }],
    }],
    code: {
      coding: [{
        system: 'http://loinc.org',
        code: '11881-0',
        display: 'Uterus Fundal height Tape measure',
      }],
      text: 'Altura uterina',
    },
    subject: {
      reference: 'Patient/patient-001',
      display: 'Maria Silva Santos',
    },
    effectiveDateTime: '2025-11-01T10:00:00Z',
    valueQuantity: {
      value: 32,
      unit: 'cm',
      system: 'http://unitsofmeasure.org',
      code: 'cm',
    },
    note: [{
      text: 'Altura uterina compatível com idade gestacional de 32 semanas',
    }],
  },
];
