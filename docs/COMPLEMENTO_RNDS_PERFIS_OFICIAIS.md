# 📘 Complemento: Perfis RNDS Oficiais e Especificações Técnicas

> **Baseado nas documentações oficiais**:
> - [Guia de Implementação RNDS](https://rnds-fhir.saude.gov.br/ImplementationGuide/rnds)
> - [BR Core - HL7 Brasil](https://hl7.org.br/fhir/core/)
> - [Portal RNDS - Ministério da Saúde](https://www.gov.br/saude/pt-br/composicao/seidigi/rnds)

---

## 📋 Índice

1. [Perfis Brasileiros Obrigatórios](#1-perfis-brasileiros-obrigatórios)
2. [Extensions Nacionais](#2-extensions-nacionais)
3. [ValueSets e CodeSystems Brasileiros](#3-valuesets-e-codesystems-brasileiros)
4. [Especificações por Recurso FHIR](#4-especificações-por-recurso-fhir)
5. [Endpoints e Operações RNDS](#5-endpoints-e-operações-rnds)
6. [Validação e Conformidade](#6-validação-e-conformidade)
7. [Casos de Uso Específicos para Pré-Natal](#7-casos-de-uso-específicos-para-pré-natal)
8. [Exemplos de Payloads Completos](#8-exemplos-de-payloads-completos)

---

## 1) Perfis Brasileiros Obrigatórios

### 1.1 BRIndividuo-1.0 (Patient)

**URL Canônica**: `https://rnds-fhir.saude.gov.br/StructureDefinition/BRIndividuo-1.0`

**Descrição**: Perfil brasileiro para representar indivíduos (pacientes/gestantes) no contexto da RNDS.

**Elementos Obrigatórios (Mandatory)**:
- `identifier` - CPF ou CNS (pelo menos um)
- `identifier.system` - Sistema de identificação
- `identifier.value` - Valor do identificador
- `name` - Nome completo (usando BRNomeIndividuo)
- `birthDate` - Data de nascimento

**Elementos Must-Support** (devem ser suportados quando disponíveis):
- `identifier` (CPF/CNS)
- `name`
- `telecom` (contato)
- `gender`
- `birthDate`
- `address` (usando BREndereco)
- `photo`
- `contact` (contatos de emergência)
- `communication.language`
- `generalPractitioner`
- `managingOrganization`
- `extension:BRRacaCorEtnia`
- `extension:BRNacionalidade`
- `extension:BRMunicipio`
- `extension:BRIndividuoProtegido`

**Elementos Proibidos** (não podem ser usados):
- `deceased[x]`
- `maritalStatus`
- `multipleBirth[x]`
- `contact.address`
- `contact.organization`
- `contact.period`
- E outros específicos documentados no IG

**Estrutura de Identificadores**:

```json
{
  "identifier": [
    {
      "use": "official",
      "type": {
        "coding": [{
          "system": "http://hl7.org/fhir/v2/0203",
          "code": "HC"
        }]
      },
      "system": "http://www.saude.gov.br/fhir/r4/StructureDefinition/BRDocumentoIndividuo-1.0",
      "value": "000.000.000-00"  // CPF formatado
    },
    {
      "use": "official",
      "type": {
        "coding": [{
          "system": "http://hl7.org/fhir/v2/0203",
          "code": "HC"
        }]
      },
      "system": "http://www.saude.gov.br/fhir/r4/StructureDefinition/BRDocumentoIndividuo-1.0",
      "value": "000000000000000"  // CNS (15 dígitos)
    }
  ]
}
```

---

### 1.2 BRNomeIndividuo-1.0 (HumanName)

**URL Canônica**: `https://rnds-fhir.saude.gov.br/StructureDefinition/BRNomeIndividuo-1.0`

**Descrição**: Data type profile para nomes de indivíduos no Brasil.

**Estrutura**:
```json
{
  "name": [{
    "use": "official",  // official | usual | nickname
    "text": "Maria da Silva Santos",  // Nome completo
    "family": "Santos",
    "given": ["Maria", "da Silva"],
    "prefix": [],
    "suffix": []
  }]
}
```

**Regras**:
- `use` deve ser "official" para o nome legal
- `text` deve conter o nome completo como string
- `family` contém o(s) sobrenome(s)
- `given` contém nome(s) e nomes do meio como array

---

### 1.3 BREndereco-1.0 (Address)

**URL Canônica**: `https://rnds-fhir.saude.gov.br/StructureDefinition/BREndereco-1.0`

**Descrição**: Endereço brasileiro conforme padrão CEP e divisões administrativas.

**Estrutura**:
```json
{
  "address": [{
    "use": "home",  // home | work | temp
    "type": "both",  // postal | physical | both
    "text": "Rua das Flores, 123, Centro, São Paulo - SP, 01000-000",
    "line": ["Rua das Flores, 123", "Apartamento 45"],
    "city": "São Paulo",
    "district": "Centro",  // Bairro
    "state": "SP",
    "postalCode": "01000-000",
    "country": "BR",
    "extension": [{
      "url": "https://rnds-fhir.saude.gov.br/StructureDefinition/BRMunicipio-1.0",
      "valueCodeableConcept": {
        "coding": [{
          "system": "http://www.saude.gov.br/fhir/r4/CodeSystem/BRDivisaoGeograficaBrasil",
          "code": "355030",  // Código IBGE do município
          "display": "São Paulo"
        }]
      }
    }]
  }]
}
```

---

### 1.4 BRMeioContato-1.0 (ContactPoint)

**URL Canônica**: `https://rnds-fhir.saude.gov.br/StructureDefinition/BRMeioContato-1.0`

**Estrutura**:
```json
{
  "telecom": [
    {
      "system": "phone",
      "value": "+55 11 98765-4321",
      "use": "mobile"  // mobile | home | work
    },
    {
      "system": "email",
      "value": "maria.santos@email.com",
      "use": "home"
    }
  ]
}
```

---

### 1.5 BRProfissional-1.0 (Practitioner)

**URL Canônica**: `https://rnds-fhir.saude.gov.br/StructureDefinition/BRProfissional-1.0`

**Descrição**: Perfil para profissionais de saúde no Brasil.

**Elementos Obrigatórios**:
- `identifier` - CPF do profissional
- `name` - Nome usando BRNomeIndividuo

**Estrutura**:
```json
{
  "resourceType": "Practitioner",
  "meta": {
    "profile": ["https://rnds-fhir.saude.gov.br/StructureDefinition/BRProfissional-1.0"]
  },
  "identifier": [
    {
      "system": "http://www.saude.gov.br/fhir/r4/StructureDefinition/BRDocumentoIndividuo-1.0",
      "value": "000.000.000-00"  // CPF do profissional
    },
    {
      "system": "http://www.saude.gov.br/fhir/r4/NamingSystem/crm",
      "value": "CRM-SP-123456"  // CRM
    }
  ],
  "active": true,
  "name": [{
    "use": "official",
    "text": "Dr. João Silva",
    "family": "Silva",
    "given": ["João"],
    "prefix": ["Dr."]
  }],
  "telecom": [
    {
      "system": "phone",
      "value": "+55 11 3333-4444",
      "use": "work"
    }
  ],
  "address": [{
    // Usar BREndereco
  }],
  "qualification": [
    {
      "code": {
        "coding": [{
          "system": "http://www.saude.gov.br/fhir/r4/CodeSystem/BRTipoDocumento",
          "code": "CRM",
          "display": "Conselho Regional de Medicina"
        }]
      },
      "issuer": {
        "display": "CRM-SP"
      }
    }
  ]
}
```

---

### 1.6 BREstabelecimentoSaude-1.0 (Organization)

**URL Canônica**: `https://rnds-fhir.saude.gov.br/StructureDefinition/BREstabelecimentoSaude-1.0`

**Descrição**: Estabelecimentos de saúde identificados pelo CNES.

**Estrutura**:
```json
{
  "resourceType": "Organization",
  "meta": {
    "profile": ["https://rnds-fhir.saude.gov.br/StructureDefinition/BREstabelecimentoSaude-1.0"]
  },
  "identifier": [
    {
      "system": "http://www.saude.gov.br/fhir/r4/NamingSystem/cnes",
      "value": "1234567"  // CNES (7 dígitos)
    },
    {
      "system": "http://www.saude.gov.br/fhir/r4/NamingSystem/cnpj",
      "value": "00.000.000/0001-00"  // CNPJ
    }
  ],
  "active": true,
  "type": [{
    "coding": [{
      "system": "http://www.saude.gov.br/fhir/r4/CodeSystem/BRTipoEstabelecimentoSaude",
      "code": "01",
      "display": "Posto de Saúde"
    }]
  }],
  "name": "Unidade Básica de Saúde Centro",
  "telecom": [{
    "system": "phone",
    "value": "+55 11 3333-5555"
  }],
  "address": [
    // Usar BREndereco
  ]
}
```

---

## 2) Extensions Nacionais

### 2.1 BRRacaCorEtnia-1.0

**URL**: `https://rnds-fhir.saude.gov.br/StructureDefinition/BRRacaCorEtnia-1.0`

**Uso**: Extension do Patient para raça/cor/etnia conforme IBGE.

```json
{
  "extension": [{
    "url": "https://rnds-fhir.saude.gov.br/StructureDefinition/BRRacaCorEtnia-1.0",
    "valueCodeableConcept": {
      "coding": [{
        "system": "http://www.saude.gov.br/fhir/r4/CodeSystem/BRRacaCor",
        "code": "03",  // 01=Branca, 02=Preta, 03=Parda, 04=Amarela, 05=Indígena
        "display": "Parda"
      }]
    }
  }]
}
```

---

### 2.2 BRNacionalidade

**URL**: `https://rnds-fhir.saude.gov.br/StructureDefinition/BRNacionalidade`

```json
{
  "extension": [{
    "url": "https://rnds-fhir.saude.gov.br/StructureDefinition/BRNacionalidade",
    "extension": [
      {
        "url": "pais",
        "valueCodeableConcept": {
          "coding": [{
            "system": "http://www.saude.gov.br/fhir/r4/CodeSystem/BRPais",
            "code": "10",  // Código do país (Brasil = 10)
            "display": "Brasil"
          }]
        }
      }
    ]
  }]
}
```

---

### 2.3 BRMunicipio-1.0

**URL**: `https://rnds-fhir.saude.gov.br/StructureDefinition/BRMunicipio-1.0`

**Uso**: Código IBGE do município (6 ou 7 dígitos).

```json
{
  "extension": [{
    "url": "https://rnds-fhir.saude.gov.br/StructureDefinition/BRMunicipio-1.0",
    "valueCodeableConcept": {
      "coding": [{
        "system": "http://www.saude.gov.br/fhir/r4/CodeSystem/BRDivisaoGeograficaBrasil",
        "code": "355030",
        "display": "São Paulo"
      }]
    }
  }]
}
```

---

### 2.4 BRIndividuoProtegido-1.0

**URL**: `https://rnds-fhir.saude.gov.br/StructureDefinition/BRIndividuoProtegido-1.0`

**Uso**: Indica se o indivíduo está sob proteção (testemunhas, etc).

```json
{
  "extension": [{
    "url": "https://rnds-fhir.saude.gov.br/StructureDefinition/BRIndividuoProtegido-1.0",
    "valueBoolean": false
  }]
}
```

---

## 3) ValueSets e CodeSystems Brasileiros

### 3.1 CodeSystems Principais

#### BRRacaCor

**URL**: `http://www.saude.gov.br/fhir/r4/CodeSystem/BRRacaCor`

| Código | Display |
|--------|---------|
| 01 | Branca |
| 02 | Preta |
| 03 | Parda |
| 04 | Amarela |
| 05 | Indígena |

---

#### BRSexo

**URL**: `http://www.saude.gov.br/fhir/r4/CodeSystem/BRSexo`

| Código | Display |
|--------|---------|
| F | Feminino |
| M | Masculino |
| I | Indeterminado |

---

#### BRTipoDocumento

**URL**: `http://www.saude.gov.br/fhir/r4/CodeSystem/BRTipoDocumento`

| Código | Display |
|--------|---------|
| CPF | Cadastro de Pessoa Física |
| CNS | Cartão Nacional de Saúde |
| CRM | Conselho Regional de Medicina |
| CNES | Cadastro Nacional de Estabelecimentos de Saúde |

---

### 3.2 Códigos LOINC para Pré-Natal

Códigos LOINC específicos para acompanhamento pré-natal que devem ser usados:

| Exame/Observação | Código LOINC | Nome |
|------------------|--------------|------|
| **USG Obstétrica 1º Trimestre** | 11636-8 | US OB >20 weeks |
| **USG Morfológica** | 11637-6 | US OB 2nd trimester |
| **Pressão Arterial Sistólica** | 8480-6 | Systolic blood pressure |
| **Pressão Arterial Diastólica** | 8462-4 | Diastolic blood pressure |
| **Peso Corporal** | 29463-7 | Body weight |
| **Altura Uterina** | 11977-6 | Uterine fundal height |
| **Idade Gestacional** | 49051-6 | Gestational age in weeks |
| **DUM** | 8665-2 | Last menstrual period start date |
| **DPP** | 11778-8 | Delivery date Estimated |
| **Hemoglobina** | 718-7 | Hemoglobin [Mass/volume] in Blood |
| **Glicemia de Jejum** | 1558-6 | Fasting glucose [Mass/volume] in Serum or Plasma |
| **HIV** | 47210-5 | HIV 1+2 Ab [Presence] in Serum |
| **VDRL** | 20507-0 | Reagin Ab [Titer] in Serum by RPR |
| **Tipagem Sanguínea** | 882-1 | ABO and Rh group [Type] in Blood |
| **Fator Rh** | 10331-7 | Rh [Type] in Blood |

---

### 3.3 Códigos CVX para Vacinas

**CodeSystem**: `http://hl7.org/fhir/sid/cvx`

| Vacina | Código CVX | Nome |
|--------|-----------|------|
| **dTpa (Tríplice Bacteriana Acelular)** | 115 | Tdap |
| **Hepatite B** | 08 | Hep B, adolescent or pediatric |
| **Influenza** | 141 | Influenza, seasonal, injectable |

---

## 4) Especificações por Recurso FHIR

### 4.1 Encounter (Atendimento/Consulta)

**Profile RNDS**: Não há profile específico brasileiro documentado ainda, mas deve seguir FHIR R4 padrão com metadados brasileiros.

**Estrutura para Consulta Pré-Natal**:

```json
{
  "resourceType": "Encounter",
  "meta": {
    "profile": ["http://hl7.org/fhir/StructureDefinition/Encounter"],
    "lastUpdated": "2025-11-18T10:00:00Z"
  },
  "identifier": [{
    "system": "http://www.meu-sistema.com.br/encounter",
    "value": "CONS-2025-001234"
  }],
  "status": "finished",  // planned | arrived | triaged | in-progress | onleave | finished | cancelled
  "class": {
    "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
    "code": "AMB",
    "display": "ambulatory"
  },
  "type": [{
    "coding": [{
      "system": "http://www.saude.gov.br/fhir/r4/CodeSystem/BRTipoAtendimento",
      "code": "03",  // Consulta programada
      "display": "Consulta Programada"
    }]
  }],
  "serviceType": {
    "coding": [{
      "system": "http://www.saude.gov.br/fhir/r4/CodeSystem/BRTipoServico",
      "code": "01",  // Atenção Básica
      "display": "Atenção Básica"
    }]
  },
  "subject": {
    "reference": "Patient/cpf-00000000000",
    "display": "Maria da Silva Santos"
  },
  "participant": [
    {
      "type": [{
        "coding": [{
          "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
          "code": "PPRF",
          "display": "primary performer"
        }]
      }],
      "individual": {
        "reference": "Practitioner/cpf-11111111111",
        "display": "Dr. João Silva"
      }
    }
  ],
  "period": {
    "start": "2025-11-18T10:00:00Z",
    "end": "2025-11-18T10:30:00Z"
  },
  "reasonCode": [{
    "coding": [{
      "system": "http://www.saude.gov.br/fhir/r4/CodeSystem/BRCIDClassificacaoDoenca",
      "code": "Z34.0",  // CID-10: Supervisão de gravidez normal
      "display": "Supervisão de gravidez normal"
    }]
  }],
  "serviceProvider": {
    "reference": "Organization/cnes-1234567",
    "display": "UBS Centro"
  },
  "location": [{
    "location": {
      "reference": "Location/sala-01"
    }
  }]
}
```

---

### 4.2 Observation (Sinais Vitais e Achados)

**Observation - Pressão Arterial**:

```json
{
  "resourceType": "Observation",
  "meta": {
    "profile": ["http://hl7.org/fhir/StructureDefinition/bp"]
  },
  "status": "final",
  "category": [{
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/observation-category",
      "code": "vital-signs",
      "display": "Vital Signs"
    }]
  }],
  "code": {
    "coding": [{
      "system": "http://loinc.org",
      "code": "85354-9",
      "display": "Blood pressure panel with all children optional"
    }],
    "text": "Pressão Arterial"
  },
  "subject": {
    "reference": "Patient/cpf-00000000000"
  },
  "encounter": {
    "reference": "Encounter/CONS-2025-001234"
  },
  "effectiveDateTime": "2025-11-18T10:15:00Z",
  "performer": [{
    "reference": "Practitioner/cpf-11111111111"
  }],
  "component": [
    {
      "code": {
        "coding": [{
          "system": "http://loinc.org",
          "code": "8480-6",
          "display": "Systolic blood pressure"
        }]
      },
      "valueQuantity": {
        "value": 120,
        "unit": "mmHg",
        "system": "http://unitsofmeasure.org",
        "code": "mm[Hg]"
      }
    },
    {
      "code": {
        "coding": [{
          "system": "http://loinc.org",
          "code": "8462-4",
          "display": "Diastolic blood pressure"
        }]
      },
      "valueQuantity": {
        "value": 80,
        "unit": "mmHg",
        "system": "http://unitsofmeasure.org",
        "code": "mm[Hg]"
      }
    }
  ]
}
```

**Observation - Peso**:

```json
{
  "resourceType": "Observation",
  "meta": {
    "profile": ["http://hl7.org/fhir/StructureDefinition/bodyweight"]
  },
  "status": "final",
  "category": [{
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/observation-category",
      "code": "vital-signs"
    }]
  }],
  "code": {
    "coding": [{
      "system": "http://loinc.org",
      "code": "29463-7",
      "display": "Body weight"
    }]
  },
  "subject": {
    "reference": "Patient/cpf-00000000000"
  },
  "encounter": {
    "reference": "Encounter/CONS-2025-001234"
  },
  "effectiveDateTime": "2025-11-18T10:15:00Z",
  "valueQuantity": {
    "value": 68.5,
    "unit": "kg",
    "system": "http://unitsofmeasure.org",
    "code": "kg"
  }
}
```

**Observation - Altura Uterina**:

```json
{
  "resourceType": "Observation",
  "status": "final",
  "category": [{
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/observation-category",
      "code": "exam"
    }]
  }],
  "code": {
    "coding": [{
      "system": "http://loinc.org",
      "code": "11977-6",
      "display": "Uterine fundal height"
    }],
    "text": "Altura Uterina"
  },
  "subject": {
    "reference": "Patient/cpf-00000000000"
  },
  "encounter": {
    "reference": "Encounter/CONS-2025-001234"
  },
  "effectiveDateTime": "2025-11-18T10:15:00Z",
  "valueQuantity": {
    "value": 25,
    "unit": "cm",
    "system": "http://unitsofmeasure.org",
    "code": "cm"
  }
}
```

**Observation - Idade Gestacional**:

```json
{
  "resourceType": "Observation",
  "status": "final",
  "code": {
    "coding": [{
      "system": "http://loinc.org",
      "code": "49051-6",
      "display": "Gestational age in weeks"
    }]
  },
  "subject": {
    "reference": "Patient/cpf-00000000000"
  },
  "effectiveDateTime": "2025-11-18T10:15:00Z",
  "valueQuantity": {
    "value": 25,
    "unit": "wk",
    "system": "http://unitsofmeasure.org",
    "code": "wk"
  }
}
```

---

### 4.3 DiagnosticReport (Resultados de Exames)

**DiagnosticReport - USG Obstétrica**:

```json
{
  "resourceType": "DiagnosticReport",
  "status": "final",
  "category": [{
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/v2-0074",
      "code": "RAD",
      "display": "Radiology"
    }]
  }],
  "code": {
    "coding": [{
      "system": "http://loinc.org",
      "code": "11636-8",
      "display": "US OB >20 weeks"
    }],
    "text": "Ultrassonografia Obstétrica"
  },
  "subject": {
    "reference": "Patient/cpf-00000000000"
  },
  "encounter": {
    "reference": "Encounter/CONS-2025-001234"
  },
  "effectiveDateTime": "2025-11-18T09:00:00Z",
  "issued": "2025-11-18T09:30:00Z",
  "performer": [{
    "reference": "Practitioner/cpf-22222222222",
    "display": "Dr. Pedro Souza"
  }],
  "result": [
    {
      "reference": "Observation/obs-biometria-fetal"
    }
  ],
  "conclusion": "Feto único, apresentação cefálica. Placenta anterior de inserção fúndica. Líquido amniótico em volume normal. Batimentos cardíacos fetais presentes e rítmicos.",
  "conclusionCode": [{
    "coding": [{
      "system": "http://snomed.info/sct",
      "code": "169564009",
      "display": "Normal obstetric ultrasound"
    }]
  }]
}
```

---

### 4.4 Immunization (Vacinação)

```json
{
  "resourceType": "Immunization",
  "status": "completed",
  "vaccineCode": {
    "coding": [
      {
        "system": "http://hl7.org/fhir/sid/cvx",
        "code": "115",
        "display": "Tdap"
      },
      {
        "system": "http://www.saude.gov.br/fhir/r4/CodeSystem/BRImunobiologico",
        "code": "88",
        "display": "dTpa adulto"
      }
    ],
    "text": "Vacina dTpa (Tríplice Bacteriana Acelular)"
  },
  "patient": {
    "reference": "Patient/cpf-00000000000"
  },
  "encounter": {
    "reference": "Encounter/CONS-2025-001234"
  },
  "occurrenceDateTime": "2025-11-18T10:20:00Z",
  "recorded": "2025-11-18T10:20:00Z",
  "primarySource": true,
  "location": {
    "reference": "Location/sala-vacinacao"
  },
  "manufacturer": {
    "display": "GSK"
  },
  "lotNumber": "ABC123456",
  "expirationDate": "2026-06-30",
  "site": {
    "coding": [{
      "system": "http://snomed.info/sct",
      "code": "368208006",
      "display": "Left upper arm structure"
    }]
  },
  "route": {
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/v3-RouteOfAdministration",
      "code": "IM",
      "display": "Intramuscular"
    }]
  },
  "doseQuantity": {
    "value": 0.5,
    "unit": "ml",
    "system": "http://unitsofmeasure.org",
    "code": "ml"
  },
  "performer": [
    {
      "function": {
        "coding": [{
          "system": "http://terminology.hl7.org/CodeSystem/v2-0443",
          "code": "AP",
          "display": "Administering Provider"
        }]
      },
      "actor": {
        "reference": "Practitioner/cpf-33333333333"
      }
    }
  ],
  "protocolApplied": [{
    "doseNumberPositiveInt": 1
  }]
}
```

---

### 4.5 CarePlan (Plano de Cuidado)

```json
{
  "resourceType": "CarePlan",
  "status": "active",
  "intent": "plan",
  "title": "Plano de Cuidado Pré-Natal",
  "description": "Linha de cuidado para gestação de risco habitual",
  "subject": {
    "reference": "Patient/cpf-00000000000",
    "display": "Maria da Silva Santos"
  },
  "period": {
    "start": "2025-01-15",
    "end": "2025-10-22"
  },
  "created": "2025-01-15",
  "author": {
    "reference": "Practitioner/cpf-11111111111",
    "display": "Dr. João Silva"
  },
  "careTeam": [{
    "reference": "CareTeam/equipe-prenatal"
  }],
  "addresses": [{
    "reference": "Condition/gravidez-2025"
  }],
  "activity": [
    {
      "detail": {
        "kind": "ServiceRequest",
        "code": {
          "coding": [{
            "system": "http://snomed.info/sct",
            "code": "424619006",
            "display": "Prenatal visit"
          }]
        },
        "status": "scheduled",
        "scheduledTiming": {
          "repeat": {
            "boundsPeriod": {
              "start": "2025-02-15",
              "end": "2025-07-15"
            },
            "frequency": 1,
            "period": 4,
            "periodUnit": "wk"
          }
        },
        "location": {
          "reference": "Location/ubs-centro"
        },
        "performer": [{
          "reference": "Practitioner/cpf-11111111111"
        }],
        "description": "Consultas mensais até 28 semanas"
      }
    },
    {
      "detail": {
        "kind": "ServiceRequest",
        "code": {
          "coding": [{
            "system": "http://loinc.org",
            "code": "11636-8",
            "display": "US OB >20 weeks"
          }]
        },
        "status": "scheduled",
        "scheduledPeriod": {
          "start": "2025-03-15",
          "end": "2025-03-30"
        },
        "description": "USG Obstétrica 1º Trimestre"
      }
    },
    {
      "detail": {
        "kind": "MedicationRequest",
        "code": {
          "coding": [{
            "system": "http://hl7.org/fhir/sid/cvx",
            "code": "115",
            "display": "Tdap"
          }]
        },
        "status": "scheduled",
        "scheduledPeriod": {
          "start": "2025-06-15",
          "end": "2025-09-15"
        },
        "description": "Vacina dTpa entre 20-36 semanas"
      }
    }
  ]
}
```

---

## 5) Endpoints e Operações RNDS

### 5.1 Base URLs

**Homologação**:
```
https://api-hmg.saude.gov.br/fhir/R4
```

**Produção**:
```
https://api.saude.gov.br/fhir/R4
```

---

### 5.2 Autenticação

**Endpoint de Token**:
```
POST https://api-hmg.saude.gov.br/token
```

**Headers**:
```
Content-Type: application/x-www-form-urlencoded
```

**Body** (usando certificado mTLS):
```
grant_type=client_credentials
scope=fhir-read fhir-write
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

---

### 5.3 Operações de Leitura (Read)

#### Buscar Paciente por CPF

```http
GET /Patient?identifier=http://www.saude.gov.br/fhir/r4/StructureDefinition/BRDocumentoIndividuo-1.0|00000000000
Authorization: Bearer {access_token}
```

#### Buscar Encounters de um Paciente

```http
GET /Encounter?subject=Patient/{id}&_lastUpdated=ge2025-01-01T00:00:00Z
Authorization: Bearer {access_token}
```

**Parâmetros de busca**:
- `subject` - Referência ao paciente
- `_lastUpdated` - Filtro de data (`ge` = greater or equal, `le` = less or equal)
- `_count` - Número de resultados por página (padrão 50, máximo 100)
- `date` - Data do encontro

#### Buscar Observations

```http
GET /Observation?subject=Patient/{id}&category=vital-signs&_lastUpdated=ge2025-01-01T00:00:00Z
Authorization: Bearer {access_token}
```

**Parâmetros**:
- `subject`
- `category` (vital-signs, exam, laboratory, etc)
- `code` - Código LOINC
- `date`
- `_lastUpdated`

#### Buscar DiagnosticReports

```http
GET /DiagnosticReport?subject=Patient/{id}&_lastUpdated=ge2025-01-01T00:00:00Z
Authorization: Bearer {access_token}
```

#### Buscar Immunizations

```http
GET /Immunization?patient=Patient/{id}&_lastUpdated=ge2025-01-01T00:00:00Z
Authorization: Bearer {access_token}
```

---

### 5.4 Operações de Escrita (Write)

#### Enviar Bundle Transacional

```http
POST /Bundle
Authorization: Bearer {access_token}
Content-Type: application/fhir+json
Idempotency-Key: {uuid-unico}
```

**Body**:
```json
{
  "resourceType": "Bundle",
  "type": "transaction",
  "entry": [
    {
      "fullUrl": "urn:uuid:encounter-123",
      "resource": {
        "resourceType": "Encounter",
        // ... encounter completo
      },
      "request": {
        "method": "POST",
        "url": "Encounter"
      }
    },
    {
      "fullUrl": "urn:uuid:observation-456",
      "resource": {
        "resourceType": "Observation",
        // ... observation completo
      },
      "request": {
        "method": "POST",
        "url": "Observation"
      }
    }
  ]
}
```

**Response** (sucesso - 200/201):
```json
{
  "resourceType": "Bundle",
  "type": "transaction-response",
  "entry": [
    {
      "response": {
        "status": "201 Created",
        "location": "Encounter/12345/_history/1",
        "etag": "W/\"1\"",
        "lastModified": "2025-11-18T10:30:00Z"
      },
      "resource": {
        "resourceType": "Encounter",
        "id": "12345",
        "meta": {
          "versionId": "1",
          "lastUpdated": "2025-11-18T10:30:00Z"
        }
        // ... resto do recurso
      }
    }
  ]
}
```

#### Atualizar Recurso Existente (com controle de versão)

```http
PUT /Encounter/12345
Authorization: Bearer {access_token}
Content-Type: application/fhir+json
If-Match: W/"1"
```

**Response** em caso de conflito (412 Precondition Failed):
```json
{
  "resourceType": "OperationOutcome",
  "issue": [{
    "severity": "error",
    "code": "conflict",
    "diagnostics": "Resource version mismatch"
  }]
}
```

---

### 5.5 Paginação

Quando há muitos resultados, a RNDS retorna links de paginação:

```json
{
  "resourceType": "Bundle",
  "type": "searchset",
  "total": 150,
  "link": [
    {
      "relation": "self",
      "url": "https://api-hmg.saude.gov.br/fhir/R4/Observation?subject=Patient/123&_count=50"
    },
    {
      "relation": "next",
      "url": "https://api-hmg.saude.gov.br/fhir/R4/Observation?subject=Patient/123&_count=50&_offset=50"
    }
  ],
  "entry": [
    // ... recursos
  ]
}
```

**Para buscar próxima página**, use o URL do link `next`.

---

## 6) Validação e Conformidade

### 6.1 Validador FHIR Local

A RNDS disponibiliza um validador local que pode ser baixado:

**Download**: Portal de Serviços DATASUS > RNDS > Validador FHIR

**Uso**:
1. Baixar o JAR do validador
2. Baixar o package RNDS (rnds#1.0.0)
3. Executar validação:

```bash
java -jar validator.jar -version 4.0 -ig rnds#1.0.0 -profile https://rnds-fhir.saude.gov.br/StructureDefinition/BRIndividuo-1.0 patient.json
```

---

### 6.2 Regras de Validação Críticas

#### Para Patient (BRIndividuo)

✅ **Obrigatório**:
- Pelo menos um `identifier` (CPF ou CNS)
- `identifier.system` correto
- `name` usando BRNomeIndividuo
- `birthDate`

❌ **Proibido**:
- `deceased[x]`
- `maritalStatus`
- `multipleBirth[x]`

#### Para Encounter

✅ **Obrigatório**:
- `status`
- `class`
- `subject` (referência válida ao Patient)

✅ **Recomendado**:
- `period.start` e `period.end`
- `serviceProvider` (Organization com CNES)
- `participant` (Practitioner responsável)

#### Para Observation

✅ **Obrigatório**:
- `status` = "final" (para dados consolidados)
- `code` com código LOINC
- `subject`
- `effectiveDateTime` ou `effectivePeriod`
- `value[x]` (o resultado da observação)

---

### 6.3 Erros Comuns e Soluções

| Erro | Causa | Solução |
|------|-------|---------|
| **422 - Unprocessable Entity** | Perfil FHIR inválido, falta de campo obrigatório | Validar localmente com validator antes de enviar |
| **409 - Conflict** | Recurso foi modificado por outro sistema | Re-read, merge e retry |
| **412 - Precondition Failed** | ETag desatualizado | Buscar versão mais recente e reenviar |
| **401 - Unauthorized** | Token expirado ou certificado inválido | Renovar token ou verificar certificado mTLS |
| **403 - Forbidden** | Escopo insuficiente ou CNES não autorizado | Verificar credenciamento e escopos |

---

## 7) Casos de Uso Específicos para Pré-Natal

### 7.1 Fluxo Completo: Primeira Consulta

**Passo 1**: Buscar/Criar Patient

```bash
GET /Patient?identifier=http://www.saude.gov.br/fhir/r4/StructureDefinition/BRDocumentoIndividuo-1.0|00000000000
```

Se não existir, criar via POST.

**Passo 2**: Criar Encounter

```json
POST /Encounter
{
  "resourceType": "Encounter",
  "status": "finished",
  "class": { "system": "...", "code": "AMB" },
  "subject": { "reference": "Patient/{id}" },
  "period": { "start": "2025-11-18T10:00:00Z", "end": "2025-11-18T10:30:00Z" }
}
```

**Passo 3**: Enviar Bundle com Observations

```json
POST /Bundle
{
  "resourceType": "Bundle",
  "type": "transaction",
  "entry": [
    {
      "resource": { /* Observation PA */ },
      "request": { "method": "POST", "url": "Observation" }
    },
    {
      "resource": { /* Observation Peso */ },
      "request": { "method": "POST", "url": "Observation" }
    },
    {
      "resource": { /* Observation Altura Uterina */ },
      "request": { "method": "POST", "url": "Observation" }
    },
    {
      "resource": { /* Observation Idade Gestacional */ },
      "request": { "method": "POST", "url": "Observation" }
    }
  ]
}
```

---

### 7.2 Sincronização Incremental

**Algoritmo**:

1. Armazenar último `_lastUpdated` para cada paciente
2. A cada intervalo (ex: 15 min), buscar recursos alterados:

```bash
GET /Encounter?subject=Patient/{id}&_lastUpdated=ge{cursor}
GET /Observation?subject=Patient/{id}&_lastUpdated=ge{cursor}
GET /DiagnosticReport?subject=Patient/{id}&_lastUpdated=ge{cursor}
GET /Immunization?patient=Patient/{id}&_lastUpdated=ge{cursor}
```

3. Processar cada Bundle de resposta
4. Atualizar cursor com o `meta.lastUpdated` mais recente

---

### 7.3 Reconciliação de Tarefas do CarePlan

**Lógica**:

1. Buscar tarefas pendentes do CarePlan local
2. Para cada tarefa, verificar se há evento RNDS correspondente:
   - **Consulta**: procurar Encounter na data agendada ±7 dias
   - **Exame**: procurar DiagnosticReport com código LOINC correspondente
   - **Vacina**: procurar Immunization com código CVX correspondente

3. Se encontrado, marcar tarefa como "completed" e associar `fhirId`

**Exemplo de matching**:

```typescript
function matchConsulta(task: Task, encounters: Encounter[]): Encounter | null {
  const taskDate = new Date(task.scheduledFor);
  
  return encounters.find(enc => {
    const encDate = new Date(enc.period.start);
    const diffDays = Math.abs((taskDate.getTime() - encDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7; // Tolerância de 7 dias
  });
}
```

---

## 8) Exemplos de Payloads Completos

### 8.1 Patient Completo (Gestante)

```json
{
  "resourceType": "Patient",
  "meta": {
    "profile": ["https://rnds-fhir.saude.gov.br/StructureDefinition/BRIndividuo-1.0"],
    "lastUpdated": "2025-11-18T10:00:00Z"
  },
  "extension": [
    {
      "url": "https://rnds-fhir.saude.gov.br/StructureDefinition/BRRacaCorEtnia-1.0",
      "valueCodeableConcept": {
        "coding": [{
          "system": "http://www.saude.gov.br/fhir/r4/CodeSystem/BRRacaCor",
          "code": "03",
          "display": "Parda"
        }]
      }
    },
    {
      "url": "https://rnds-fhir.saude.gov.br/StructureDefinition/BRNacionalidade",
      "extension": [{
        "url": "pais",
        "valueCodeableConcept": {
          "coding": [{
            "system": "http://www.saude.gov.br/fhir/r4/CodeSystem/BRPais",
            "code": "10",
            "display": "Brasil"
          }]
        }
      }]
    }
  ],
  "identifier": [
    {
      "use": "official",
      "type": {
        "coding": [{
          "system": "http://hl7.org/fhir/v2/0203",
          "code": "HC"
        }]
      },
      "system": "http://www.saude.gov.br/fhir/r4/StructureDefinition/BRDocumentoIndividuo-1.0",
      "value": "123.456.789-00"
    },
    {
      "use": "official",
      "type": {
        "coding": [{
          "system": "http://hl7.org/fhir/v2/0203",
          "code": "HC"
        }]
      },
      "system": "http://www.saude.gov.br/fhir/r4/StructureDefinition/BRDocumentoIndividuo-1.0",
      "value": "123456789012345"
    }
  ],
  "active": true,
  "name": [{
    "use": "official",
    "text": "Maria da Silva Santos",
    "family": "Santos",
    "given": ["Maria", "da Silva"]
  }],
  "telecom": [
    {
      "system": "phone",
      "value": "+55 11 98765-4321",
      "use": "mobile"
    },
    {
      "system": "email",
      "value": "maria.santos@email.com",
      "use": "home"
    }
  ],
  "gender": "female",
  "birthDate": "1995-05-15",
  "address": [{
    "use": "home",
    "type": "both",
    "text": "Rua das Flores, 123, Centro, São Paulo - SP, 01000-000",
    "line": ["Rua das Flores, 123", "Apartamento 45"],
    "city": "São Paulo",
    "district": "Centro",
    "state": "SP",
    "postalCode": "01000-000",
    "country": "BR",
    "extension": [{
      "url": "https://rnds-fhir.saude.gov.br/StructureDefinition/BRMunicipio-1.0",
      "valueCodeableConcept": {
        "coding": [{
          "system": "http://www.saude.gov.br/fhir/r4/CodeSystem/BRDivisaoGeograficaBrasil",
          "code": "355030",
          "display": "São Paulo"
        }]
      }
    }]
  }],
  "contact": [
    {
      "relationship": [{
        "coding": [{
          "system": "http://terminology.hl7.org/CodeSystem/v2-0131",
          "code": "C",
          "display": "Emergency Contact"
        }]
      }],
      "name": {
        "text": "José Santos",
        "family": "Santos",
        "given": ["José"]
      },
      "telecom": [{
        "system": "phone",
        "value": "+55 11 98888-7777",
        "use": "mobile"
      }]
    }
  ],
  "generalPractitioner": [{
    "reference": "Practitioner/cpf-11111111111",
    "display": "Dr. João Silva"
  }],
  "managingOrganization": {
    "reference": "Organization/cnes-1234567",
    "display": "UBS Centro"
  }
}
```

---

### 8.2 Bundle Transacional Completo (Consulta + Observações)

```json
{
  "resourceType": "Bundle",
  "type": "transaction",
  "entry": [
    {
      "fullUrl": "urn:uuid:encounter-001",
      "resource": {
        "resourceType": "Encounter",
        "status": "finished",
        "class": {
          "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
          "code": "AMB",
          "display": "ambulatory"
        },
        "type": [{
          "coding": [{
            "system": "http://www.saude.gov.br/fhir/r4/CodeSystem/BRTipoAtendimento",
            "code": "03",
            "display": "Consulta Programada"
          }]
        }],
        "subject": {
          "reference": "Patient/cpf-12345678900"
        },
        "participant": [{
          "individual": {
            "reference": "Practitioner/cpf-11111111111"
          }
        }],
        "period": {
          "start": "2025-11-18T10:00:00Z",
          "end": "2025-11-18T10:30:00Z"
        },
        "reasonCode": [{
          "coding": [{
            "system": "http://www.saude.gov.br/fhir/r4/CodeSystem/BRCIDClassificacaoDoenca",
            "code": "Z34.0",
            "display": "Supervisão de gravidez normal"
          }]
        }],
        "serviceProvider": {
          "reference": "Organization/cnes-1234567"
        }
      },
      "request": {
        "method": "POST",
        "url": "Encounter"
      }
    },
    {
      "fullUrl": "urn:uuid:observation-pa",
      "resource": {
        "resourceType": "Observation",
        "meta": {
          "profile": ["http://hl7.org/fhir/StructureDefinition/bp"]
        },
        "status": "final",
        "category": [{
          "coding": [{
            "system": "http://terminology.hl7.org/CodeSystem/observation-category",
            "code": "vital-signs"
          }]
        }],
        "code": {
          "coding": [{
            "system": "http://loinc.org",
            "code": "85354-9",
            "display": "Blood pressure panel"
          }]
        },
        "subject": {
          "reference": "Patient/cpf-12345678900"
        },
        "encounter": {
          "reference": "urn:uuid:encounter-001"
        },
        "effectiveDateTime": "2025-11-18T10:15:00Z",
        "component": [
          {
            "code": {
              "coding": [{
                "system": "http://loinc.org",
                "code": "8480-6"
              }]
            },
            "valueQuantity": {
              "value": 120,
              "unit": "mmHg",
              "system": "http://unitsofmeasure.org",
              "code": "mm[Hg]"
            }
          },
          {
            "code": {
              "coding": [{
                "system": "http://loinc.org",
                "code": "8462-4"
              }]
            },
            "valueQuantity": {
              "value": 80,
              "unit": "mmHg",
              "system": "http://unitsofmeasure.org",
              "code": "mm[Hg]"
            }
          }
        ]
      },
      "request": {
        "method": "POST",
        "url": "Observation"
      }
    },
    {
      "fullUrl": "urn:uuid:observation-peso",
      "resource": {
        "resourceType": "Observation",
        "meta": {
          "profile": ["http://hl7.org/fhir/StructureDefinition/bodyweight"]
        },
        "status": "final",
        "category": [{
          "coding": [{
            "system": "http://terminology.hl7.org/CodeSystem/observation-category",
            "code": "vital-signs"
          }]
        }],
        "code": {
          "coding": [{
            "system": "http://loinc.org",
            "code": "29463-7",
            "display": "Body weight"
          }]
        },
        "subject": {
          "reference": "Patient/cpf-12345678900"
        },
        "encounter": {
          "reference": "urn:uuid:encounter-001"
        },
        "effectiveDateTime": "2025-11-18T10:15:00Z",
        "valueQuantity": {
          "value": 68.5,
          "unit": "kg",
          "system": "http://unitsofmeasure.org",
          "code": "kg"
        }
      },
      "request": {
        "method": "POST",
        "url": "Observation"
      }
    },
    {
      "fullUrl": "urn:uuid:observation-au",
      "resource": {
        "resourceType": "Observation",
        "status": "final",
        "category": [{
          "coding": [{
            "system": "http://terminology.hl7.org/CodeSystem/observation-category",
            "code": "exam"
          }]
        }],
        "code": {
          "coding": [{
            "system": "http://loinc.org",
            "code": "11977-6",
            "display": "Uterine fundal height"
          }]
        },
        "subject": {
          "reference": "Patient/cpf-12345678900"
        },
        "encounter": {
          "reference": "urn:uuid:encounter-001"
        },
        "effectiveDateTime": "2025-11-18T10:15:00Z",
        "valueQuantity": {
          "value": 25,
          "unit": "cm",
          "system": "http://unitsofmeasure.org",
          "code": "cm"
        }
      },
      "request": {
        "method": "POST",
        "url": "Observation"
      }
    },
    {
      "fullUrl": "urn:uuid:observation-ig",
      "resource": {
        "resourceType": "Observation",
        "status": "final",
        "code": {
          "coding": [{
            "system": "http://loinc.org",
            "code": "49051-6",
            "display": "Gestational age in weeks"
          }]
        },
        "subject": {
          "reference": "Patient/cpf-12345678900"
        },
        "effectiveDateTime": "2025-11-18T10:15:00Z",
        "valueQuantity": {
          "value": 25,
          "unit": "wk",
          "system": "http://unitsofmeasure.org",
          "code": "wk"
        }
      },
      "request": {
        "method": "POST",
        "url": "Observation"
      }
    }
  ]
}
```

---

## 📚 Recursos Adicionais

### Documentação Oficial

- **Guia de Implementação RNDS**: https://rnds-fhir.saude.gov.br/ImplementationGuide/rnds
- **BR Core**: https://hl7.org.br/fhir/core/
- **Portal RNDS**: https://www.gov.br/saude/pt-br/composicao/seidigi/rnds
- **Portal de Serviços DATASUS**: https://servicos-datasus.saude.gov.br/
- **Guia Integração RNDS**: https://rnds-guia.saude.gov.br/

### Ferramentas

- **Simplifier.NET (perfis RNDS)**: https://simplifier.net/rnds
- **Validador FHIR**: Disponível no Portal de Serviços
- **Postman Collections**: Disponível no Portal de Serviços

### Suporte

- **Canal RNDS no Telegram**: Grupo oficial de suporte
- **Fórum RNDS**: https://forum.rnds.saude.gov.br/
- **E-mail**: rnds@saude.gov.br

---

**Documento atualizado**: 18/11/2025
**Versão RNDS**: 1.0.0
**Versão FHIR**: R4 (4.0.1)
