// Dataset de pacientes fictícios 100% compatível com BRIndividuo-1.0
// Baseado na especificação oficial RNDS FHIR

export const mockPatients = [
  {
    resourceType: 'Patient',
    id: 'patient-001',
    meta: {
      versionId: '1',
      lastUpdated: '2025-11-01T10:00:00Z',
      profile: ['http://www.saude.gov.br/fhir/r4/StructureDefinition/BRIndividuo-1.0'],
    },
    // OBRIGATÓRIO: active
    active: true,

    // Identificadores (BRDocumentoIndividuo)
    identifier: [
      {
        use: 'official',
        type: {
          coding: [{
            system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRTipoDocumento',
            code: 'CPF',
          }],
        },
        system: 'http://www.saude.gov.br/fhir/r4/NamingSystem/cpf',
        value: '12345678901',
      },
      {
        use: 'official',
        type: {
          coding: [{
            system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRTipoDocumento',
            code: 'CNS',
          }],
        },
        system: 'http://www.saude.gov.br/fhir/r4/NamingSystem/cns',
        value: '123456789012345',
      },
    ],

    // Nome (BRNomeIndividuo)
    name: [{
      use: 'official',
      text: 'Maria Silva Santos',
      family: 'Santos',
      given: ['Maria', 'Silva'],
    }],

    // Contato (BRMeioContato)
    telecom: [
      {
        system: 'phone',
        value: '11987654321',
        use: 'mobile',
      },
      {
        system: 'email',
        value: 'maria.silva@example.com',
        use: 'home',
      },
    ],

    // OBRIGATÓRIO: gender (BRSexo-1.0)
    gender: 'female',

    // OBRIGATÓRIO: birthDate
    birthDate: '1990-05-15',

    // Endereço (BREndereco) - estrutura conforme especificação
    address: [{
      use: 'home',                    // OBRIGATÓRIO
      type: 'physical',               // OBRIGATÓRIO
      line: [
        'Rua das Flores',             // street
        '123',                        // number
        'Apto 45',                    // complement
        'Centro'                      // neighborhood
      ],
      city: 'São Paulo',              // OBRIGATÓRIO (BRMunicipio-1.0)
      state: 'SP',                    // OBRIGATÓRIO (BRUnidadeFederativa-1.0)
      postalCode: '01234567',         // OBRIGATÓRIO
      country: 'BRA',
    }],

    // Extension OBRIGATÓRIA: birthCountry
    extension: [
      {
        url: 'http://www.saude.gov.br/fhir/r4/StructureDefinition/BRPaisNascimento',
        valueCodeableConcept: {
          coding: [{
            system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRPais',
            code: 'BRA',
            display: 'Brasil',
          }],
        },
      },
    ],
  },
  {
    resourceType: 'Patient',
    id: 'patient-002',
    meta: {
      versionId: '1',
      lastUpdated: '2025-11-02T10:00:00Z',
      profile: ['http://www.saude.gov.br/fhir/r4/StructureDefinition/BRIndividuo-1.0'],
    },
    active: true,
    identifier: [
      {
        use: 'official',
        type: {
          coding: [{
            system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRTipoDocumento',
            code: 'CPF',
          }],
        },
        system: 'http://www.saude.gov.br/fhir/r4/NamingSystem/cpf',
        value: '98765432109',
      },
      {
        use: 'official',
        type: {
          coding: [{
            system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRTipoDocumento',
            code: 'CNS',
          }],
        },
        system: 'http://www.saude.gov.br/fhir/r4/NamingSystem/cns',
        value: '987654321098765',
      },
    ],
    name: [{
      use: 'official',
      text: 'Ana Paula Costa',
      family: 'Costa',
      given: ['Ana', 'Paula'],
    }],
    telecom: [{
      system: 'phone',
      value: '11976543210',
      use: 'mobile',
    }],
    gender: 'female',
    birthDate: '1995-08-22',
    address: [{
      use: 'home',
      type: 'physical',
      line: [
        'Avenida Paulista',
        '1000',
        '',
        'Bela Vista'
      ],
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01310100',
      country: 'BRA',
    }],
    extension: [
      {
        url: 'http://www.saude.gov.br/fhir/r4/StructureDefinition/BRPaisNascimento',
        valueCodeableConcept: {
          coding: [{
            system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRPais',
            code: 'BRA',
            display: 'Brasil',
          }],
        },
      },
    ],
  },
  {
    resourceType: 'Patient',
    id: 'patient-003',
    meta: {
      versionId: '1',
      lastUpdated: '2025-11-03T10:00:00Z',
      profile: ['http://www.saude.gov.br/fhir/r4/StructureDefinition/BRIndividuo-1.0'],
    },
    active: true,
    identifier: [
      {
        use: 'official',
        type: {
          coding: [{
            system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRTipoDocumento',
            code: 'CPF',
          }],
        },
        system: 'http://www.saude.gov.br/fhir/r4/NamingSystem/cpf',
        value: '11122233344',
      },
      {
        use: 'official',
        type: {
          coding: [{
            system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRTipoDocumento',
            code: 'CNS',
          }],
        },
        system: 'http://www.saude.gov.br/fhir/r4/NamingSystem/cns',
        value: '111222333444555',
      },
    ],
    name: [{
      use: 'official',
      text: 'Juliana Oliveira Lima',
      family: 'Lima',
      given: ['Juliana', 'Oliveira'],
    }],
    telecom: [{
      system: 'phone',
      value: '21987654321',
      use: 'mobile',
    }],
    gender: 'female',
    birthDate: '1992-03-10',
    address: [{
      use: 'home',
      type: 'physical',
      line: [
        'Rua das Laranjeiras',
        '456',
        '',
        'Laranjeiras'
      ],
      city: 'Rio de Janeiro',
      state: 'RJ',
      postalCode: '22240006',
      country: 'BRA',
    }],
    extension: [
      {
        url: 'http://www.saude.gov.br/fhir/r4/StructureDefinition/BRPaisNascimento',
        valueCodeableConcept: {
          coding: [{
            system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRPais',
            code: 'BRA',
            display: 'Brasil',
          }],
        },
      },
    ],
  },
  {
    resourceType: 'Patient',
    id: 'patient-004',
    meta: {
      versionId: '1',
      lastUpdated: '2025-11-04T10:00:00Z',
      profile: ['http://www.saude.gov.br/fhir/r4/StructureDefinition/BRIndividuo-1.0'],
    },
    active: true,
    identifier: [
      {
        use: 'official',
        type: {
          coding: [{
            system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRTipoDocumento',
            code: 'CPF',
          }],
        },
        system: 'http://www.saude.gov.br/fhir/r4/NamingSystem/cpf',
        value: '55566677788',
      },
      {
        use: 'official',
        type: {
          coding: [{
            system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRTipoDocumento',
            code: 'CNS',
          }],
        },
        system: 'http://www.saude.gov.br/fhir/r4/NamingSystem/cns',
        value: '555666777888999',
      },
    ],
    name: [{
      use: 'official',
      text: 'Fernanda Souza Alves',
      family: 'Alves',
      given: ['Fernanda', 'Souza'],
    }],
    telecom: [{
      system: 'phone',
      value: '31987654321',
      use: 'mobile',
    }],
    gender: 'female',
    birthDate: '1988-11-30',
    address: [{
      use: 'home',
      type: 'physical',
      line: [
        'Rua da Bahia',
        '789',
        '',
        'Centro'
      ],
      city: 'Belo Horizonte',
      state: 'MG',
      postalCode: '30160011',
      country: 'BRA',
    }],
    extension: [
      {
        url: 'http://www.saude.gov.br/fhir/r4/StructureDefinition/BRPaisNascimento',
        valueCodeableConcept: {
          coding: [{
            system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRPais',
            code: 'BRA',
            display: 'Brasil',
          }],
        },
      },
    ],
  },
  {
    resourceType: 'Patient',
    id: 'patient-005',
    meta: {
      versionId: '1',
      lastUpdated: '2025-11-05T10:00:00Z',
      profile: ['http://www.saude.gov.br/fhir/r4/StructureDefinition/BRIndividuo-1.0'],
    },
    active: true,
    identifier: [
      {
        use: 'official',
        type: {
          coding: [{
            system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRTipoDocumento',
            code: 'CPF',
          }],
        },
        system: 'http://www.saude.gov.br/fhir/r4/NamingSystem/cpf',
        value: '99988877766',
      },
      {
        use: 'official',
        type: {
          coding: [{
            system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRTipoDocumento',
            code: 'CNS',
          }],
        },
        system: 'http://www.saude.gov.br/fhir/r4/NamingSystem/cns',
        value: '999888777666555',
      },
    ],
    name: [{
      use: 'official',
      text: 'Carla Rodrigues Mendes',
      family: 'Mendes',
      given: ['Carla', 'Rodrigues'],
    }],
    telecom: [{
      system: 'phone',
      value: '41987654321',
      use: 'mobile',
    }],
    gender: 'female',
    birthDate: '1993-07-18',
    address: [{
      use: 'home',
      type: 'physical',
      line: [
        'Rua XV de Novembro',
        '321',
        '',
        'Centro'
      ],
      city: 'Curitiba',
      state: 'PR',
      postalCode: '80020310',
      country: 'BRA',
    }],
    extension: [
      {
        url: 'http://www.saude.gov.br/fhir/r4/StructureDefinition/BRPaisNascimento',
        valueCodeableConcept: {
          coding: [{
            system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRPais',
            code: 'BRA',
            display: 'Brasil',
          }],
        },
      },
    ],
  },
];
