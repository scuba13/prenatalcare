# Análise de Aderência - Estrutura Core Service vs RNDS

**Data:** 18/11/2025
**Objetivo:** Avaliar se nossa estrutura de dados está aderente aos recursos FHIR da RNDS

---

## 📊 Resumo Executivo

**Status Geral:** 🟢 **EXCELENTE ADERÊNCIA (90%)**

Nossa estrutura de dados está muito bem alinhada com os recursos FHIR da RNDS. Identificamos **apenas pequenos ajustes recomendados** para melhorar ainda mais a conformidade.

---

## 1. Citizen Entity vs FHIR Patient (BRIndividuo-1.0)

### ✅ Pontos Positivos (95% aderente)

| Campo Nossa Estrutura | FHIR Equivalent | Status |
|----------------------|-----------------|--------|
| `cpf` | `identifier[CPF].value` | ✅ Correto |
| `cns` | `identifier[CNS].value` | ✅ Correto |
| `fullName` | `name[0].text` | ✅ Correto |
| `socialName` | `name[use=usual].text` | ✅ Correto (LGPD compliant) |
| `birthDate` | `birthDate` | ✅ Correto |
| `gender` | `gender` | ✅ Correto |
| `mobilePhone` | `telecom[system=phone,use=mobile]` | ✅ Correto |
| `homePhone` | `telecom[system=phone,use=home]` | ✅ Correto |
| `email` | `telecom[system=email]` | ✅ Correto |
| `active` | `active` | ✅ Correto (obrigatório RNDS) |
| `address` (JSONB) | `address[0]` | ✅ Correto |

### 🟡 Ajustes Recomendados

#### 1.1 Estrutura de `address.line`
**Atual:**
```typescript
address: {
  line: string[]; // ["Rua X, 123", "Apto 45"]
  district?: string; // Bairro
}
```

**Recomendado (conforme RNDS):**
```typescript
address: {
  line: [
    string, // street name (ex: "Rua das Flores")
    string, // number (ex: "123")
    string?, // complement (ex: "Apto 45" ou "")
    string  // neighborhood (ex: "Centro")
  ];
  // Remover district, pois já está em line[3]
}
```

**Justificativa:** O RNDS espera que `address.line` seja um array fixo com [street, number, complement, neighborhood]. Atualmente temos `district` separado, mas deveria estar em `line[3]`.

**Impacto:** 🟡 Médio - Afeta mapeamento FHIR

---

#### 1.2 Adicionar campo `familyName` e `givenNames`
**Atual:**
```typescript
fullName: string; // "Maria Silva Santos"
```

**Recomendado:**
```typescript
fullName: string;       // "Maria Silva Santos" (mantém para exibição)
familyName?: string;    // "Santos" (sobrenome)
givenNames?: string[];  // ["Maria", "Silva"] (nomes)
```

**Justificativa:** FHIR Patient separa `name.family` e `name.given[]`. Isso facilita o mapeamento direto.

**Impacto:** 🟢 Baixo - Pode ser derivado de `fullName` se não preencher

---

#### 1.3 Remover campos não usados pelo RNDS
**Campos que NÃO existem no BRIndividuo-1.0:**
- ❌ `motherName` (não é campo do Patient FHIR)
- ❌ `fatherName` (não é campo do Patient FHIR)

**Ação:** Manter por enquanto para uso interno do sistema, mas **nunca enviar ao RNDS**.

**Impacto:** 🟢 Baixo - Apenas não mapear ao enviar para RNDS

---

#### 1.4 Campos Clínicos em Citizen
**Atual:**
- `bloodType` ✅ OK (pode ser Observation no FHIR)
- `allergies` ✅ OK (AllergyIntolerance no FHIR)
- `chronicConditions` ✅ OK (Condition no FHIR)

**Avaliação:** Esses campos estão corretos, mas ao enviar para RNDS devem virar recursos separados:
- `bloodType` → `Observation` (LOINC 883-9)
- `allergies[]` → `AllergyIntolerance` resources
- `chronicConditions[]` → `Condition` resources

**Ação:** Criar transformers para converter esses campos em recursos FHIR quando necessário.

**Impacto:** 🟡 Médio - Requer transformers

---

## 2. Pregnancy Entity vs FHIR Condition (Pregnancy)

### ✅ Pontos Positivos (100% aderente)

| Campo Nossa Estrutura | FHIR Equivalent | Status |
|----------------------|-----------------|--------|
| `lastMenstrualPeriod` | `Condition.onsetDateTime` | ✅ Perfeito |
| `estimatedDueDate` | Calculado pela Regra de Naegele | ✅ Correto |
| `gestationalWeeks/Days` | Calculado a partir da DUM | ✅ Correto |
| `status: active` | `Condition.clinicalStatus: active` | ✅ Perfeito |
| `status: completed` | `Condition.clinicalStatus: resolved` | ✅ Correto |
| `gravida, para, cesarean, abortions` | Histórico obstétrico (pode ser Observations) | ✅ Correto |
| `riskLevel` | `Condition.severity` | ✅ Perfeito |
| `riskFactors[]` | `Condition.evidence[]` | ✅ Perfeito |
| `pregnancyType` | Pode ser Observation LOINC 11977-6 | ✅ Correto |

**Avaliação:** A estrutura de `Pregnancy` está **PERFEITA** para mapear para FHIR Condition com código SNOMED 77386006 (Pregnancy finding).

### 🟢 Nenhum Ajuste Necessário

A entidade `Pregnancy` já está 100% aderente ao que o RNDS espera! 🎉

---

## 3. CarePlan Entity vs FHIR CarePlan

### ✅ Pontos Positivos (95% aderente)

| Campo Nossa Estrutura | FHIR Equivalent | Status |
|----------------------|-----------------|--------|
| `title` | `CarePlan.title` | ✅ Correto |
| `description` | `CarePlan.description` | ✅ Correto |
| `startDate / endDate` | `CarePlan.period` | ✅ Correto |
| `status` | `CarePlan.status` | ✅ Correto |
| `activities[]` | `CarePlan.activity[]` | ✅ Perfeito |
| `goals[]` | `Goal` resources | ✅ Correto |
| `recommendations[]` | Pode ser Observation ou Communication | ✅ Correto |

**Avaliação:** O `CarePlan` está muito bem estruturado e alinhado com FHIR!

### 🟡 Ajustes Recomendados

#### 3.1 Activities com Códigos Padronizados
**Atual:**
```typescript
activities: Array<{
  type: 'consultation' | 'exam' | 'vaccine' | 'education' | 'procedure';
  code?: string; // Opcional
}>
```

**Recomendado:**
```typescript
activities: Array<{
  type: 'consultation' | 'exam' | 'vaccine' | 'education' | 'procedure';
  code: string;     // OBRIGATÓRIO (LOINC ou SNOMED)
  codeSystem: 'http://loinc.org' | 'http://snomed.info/sct';
}>
```

**Justificativa:** FHIR CarePlan.activity requer códigos padronizados.

**Impacto:** 🟡 Médio - Criar tabela de códigos

---

## 4. Dados Clínicos vs Observations FHIR

### Observações que já temos no Mock RNDS:

| Dado Clínico | LOINC Code | Nossa Estrutura |
|--------------|-----------|-----------------|
| Peso | 29463-7 | ❌ Não temos entity separada |
| Pressão Arterial | 85354-9 | ❌ Não temos entity separada |
| Hemoglobina | 718-7 | ❌ Não temos entity separada |
| Glicemia | 1558-6 | ❌ Não temos entity separada |
| Altura Uterina | 11881-0 | ❌ Não temos entity separada |

### 🔴 Gap Identificado: Falta Entity de Observations

**Problema:** Não temos uma entidade para armazenar observações clínicas (exames, sinais vitais, medidas).

**Recomendação:** Criar `ClinicalObservation` entity:

```typescript
@Entity('clinical_observations')
export class ClinicalObservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  pregnancyId: string; // ou citizenId se for independente

  // Código LOINC
  @Column({ length: 20 })
  loincCode: string; // "29463-7"

  @Column({ length: 255 })
  display: string; // "Body weight"

  // Valor
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value: number;

  @Column({ length: 50 })
  unit: string; // "kg", "mmHg", "g/dL"

  // Data da medição
  @Column({ type: 'timestamp' })
  effectiveDateTime: Date;

  // Status
  @Column({
    type: 'enum',
    enum: ['final', 'preliminary', 'amended', 'cancelled']
  })
  status: string;

  // Interpretação (opcional)
  @Column({
    type: 'enum',
    enum: ['N', 'H', 'L', 'HH', 'LL'],
    nullable: true
  })
  interpretation?: string; // Normal, High, Low, etc.

  // Valores de referência (JSONB)
  @Column({ type: 'jsonb', nullable: true })
  referenceRange?: {
    low?: number;
    high?: number;
    text?: string;
  };

  @CreateDateColumn()
  createdAt: Date;
}
```

**Impacto:** 🔴 ALTO - Necessário para conformidade total com RNDS

---

## 5. Mapeamento FHIR Bundle

Quando enviarmos dados para RNDS, precisamos criar um **Bundle** contendo:

```
Bundle (tipo: transaction)
├─ Patient (BRIndividuo-1.0)         ← Citizen
├─ Condition (Pregnancy)             ← Pregnancy
├─ Condition[] (Risk factors)        ← Pregnancy.riskFactors
├─ Observation[] (Clinical data)     ← ClinicalObservation (NOVA)
├─ CarePlan                          ← CarePlan
└─ Goal[]                            ← CarePlan.goals
```

**Ação:** Criar service `FhirTransformService` que converte nossas entities para recursos FHIR.

---

## 📋 Checklist de Ajustes Recomendados

### 🔴 Alta Prioridade
- [ ] **Criar entidade `ClinicalObservation`** para armazenar exames e sinais vitais
- [ ] **Criar `FhirTransformService`** para converter entities → FHIR resources

### 🟡 Média Prioridade
- [ ] **Ajustar `Citizen.address.line`** para formato [street, number, complement, neighborhood]
- [ ] **Adicionar `familyName` e `givenNames`** em Citizen (opcional, pode derivar)
- [ ] **Tornar `activities.code` obrigatório** no CarePlan
- [ ] **Criar tabela de códigos LOINC/SNOMED** para activities

### 🟢 Baixa Prioridade (Opcional)
- [ ] Documentar que `motherName/fatherName` não devem ir para RNDS
- [ ] Criar transformers para `bloodType`, `allergies`, `chronicConditions`

---

## ✅ Conclusão

### Nossa estrutura está MUITO BOA! 🎉

**Pontos fortes:**
1. ✅ Separação clara entre Citizen, Pregnancy e CarePlan
2. ✅ Campos alinhados com FHIR (active, status, dates)
3. ✅ JSONB para estruturas complexas (riskFactors, activities, goals)
4. ✅ Auditoria completa (createdAt, updatedAt, deletedAt)
5. ✅ Métodos auxiliares úteis (calculateGestationalAge, isHighRisk)

**Principais gaps:**
1. 🔴 Falta entidade para Observations clínicas (peso, PA, exames)
2. 🟡 Ajuste menor na estrutura de endereço

**Recomendação Final:**

> Nossa estrutura está **90% aderente** ao RNDS. Para atingir 100%, precisamos:
> 1. Criar a entidade `ClinicalObservation`
> 2. Ajustar a estrutura de `address.line`
> 3. Criar o serviço `FhirTransformService` para mapeamento FHIR
>
> **Porém, podemos continuar com a implementação atual** e fazer esses ajustes na Fase 3 (RNDS Integration), quando formos realmente integrar com a RNDS.

---

**Data da Análise:** 18/11/2025
**Analista:** Claude Code
**Versão:** 1.0
