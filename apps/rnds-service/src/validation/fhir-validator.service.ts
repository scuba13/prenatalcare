import { Injectable, Logger } from '@nestjs/common';

/**
 * Interface para resultado de validação FHIR
 */
export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  severity: 'fatal' | 'error' | 'warning' | 'information' | 'success';
}

/**
 * Interface para issue de validação
 */
export interface ValidationIssue {
  severity: 'fatal' | 'error' | 'warning' | 'information';
  code: string;
  details: string;
  diagnostics?: string;
  location?: string;
  expression?: string[];
}

/**
 * Serviço de Validação FHIR
 * Valida recursos FHIR contra profiles brasileiros (BRIndividuo, etc.)
 */
@Injectable()
export class FhirValidatorService {
  private readonly logger = new Logger(FhirValidatorService.name);

  /**
   * Valida um recurso FHIR
   * @param resource Recurso FHIR a ser validado
   * @param profileUrl URL do profile FHIR (opcional)
   * @returns Resultado da validação
   */
  async validate(
    resource: any,
    profileUrl?: string,
  ): Promise<ValidationResult> {
    this.logger.log(
      `Validando recurso ${resource.resourceType} ${profileUrl ? `contra profile ${profileUrl}` : ''}`,
    );

    const issues: ValidationIssue[] = [];

    try {
      // 1. Validações básicas de estrutura FHIR
      this.validateBasicStructure(resource, issues);

      // 2. Validações específicas por tipo de recurso
      switch (resource.resourceType) {
        case 'Patient':
          this.validatePatient(resource, issues);
          break;
        case 'Condition':
          this.validateCondition(resource, issues);
          break;
        case 'Observation':
          this.validateObservation(resource, issues);
          break;
        case 'CarePlan':
          this.validateCarePlan(resource, issues);
          break;
        case 'Bundle':
          this.validateBundle(resource, issues);
          break;
        default:
          this.logger.warn(
            `Tipo de recurso não suportado para validação: ${resource.resourceType}`,
          );
      }

      // 3. Validar conformidade com profile brasileiro se especificado
      if (profileUrl) {
        this.validateProfile(resource, profileUrl, issues);
      }

      // 4. Determinar severidade geral
      const severity = this.determineSeverity(issues);
      const valid = severity !== 'fatal' && severity !== 'error';

      this.logger.log(
        `Validação concluída: ${valid ? 'VÁLIDO' : 'INVÁLIDO'} (${issues.length} issues)`,
      );

      return {
        valid,
        issues,
        severity,
      };
    } catch (error) {
      this.logger.error(`Erro durante validação: ${error.message}`);

      return {
        valid: false,
        issues: [
          {
            severity: 'fatal',
            code: 'exception',
            details: 'Erro interno durante validação',
            diagnostics: error.message,
          },
        ],
        severity: 'fatal',
      };
    }
  }

  /**
   * Valida estrutura básica de recurso FHIR
   */
  private validateBasicStructure(
    resource: any,
    issues: ValidationIssue[],
  ): void {
    // resourceType é obrigatório
    if (!resource.resourceType) {
      issues.push({
        severity: 'fatal',
        code: 'required',
        details: 'resourceType é obrigatório',
        location: 'resourceType',
      });
    }

    // Validar meta.profile se presente
    if (resource.meta?.profile) {
      if (!Array.isArray(resource.meta.profile)) {
        issues.push({
          severity: 'error',
          code: 'structure',
          details: 'meta.profile deve ser um array',
          location: 'meta.profile',
        });
      }
    }
  }

  /**
   * Valida recurso Patient (BRIndividuo-1.0)
   */
  private validatePatient(resource: any, issues: ValidationIssue[]): void {
    // Identifier é obrigatório (CPF ou CNS)
    if (!resource.identifier || resource.identifier.length === 0) {
      issues.push({
        severity: 'error',
        code: 'required',
        details: 'Patient deve ter ao menos um identifier (CPF ou CNS)',
        location: 'Patient.identifier',
      });
    } else {
      // Validar CPF se presente
      const cpfIdentifier = resource.identifier.find(
        (id: any) =>
          id.system ===
          'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf',
      );

      if (cpfIdentifier) {
        if (!cpfIdentifier.value || cpfIdentifier.value.length !== 11) {
          issues.push({
            severity: 'error',
            code: 'invalid',
            details: 'CPF deve ter exatamente 11 dígitos',
            location: 'Patient.identifier[cpf].value',
          });
        }
      }

      // Validar CNS se presente
      const cnsIdentifier = resource.identifier.find(
        (id: any) =>
          id.system ===
          'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns',
      );

      if (cnsIdentifier) {
        if (!cnsIdentifier.value || cnsIdentifier.value.length !== 15) {
          issues.push({
            severity: 'error',
            code: 'invalid',
            details: 'CNS deve ter exatamente 15 dígitos',
            location: 'Patient.identifier[cns].value',
          });
        }
      }
    }

    // name é obrigatório
    if (!resource.name || resource.name.length === 0) {
      issues.push({
        severity: 'error',
        code: 'required',
        details: 'Patient.name é obrigatório',
        location: 'Patient.name',
      });
    }

    // gender é obrigatório
    if (!resource.gender) {
      issues.push({
        severity: 'error',
        code: 'required',
        details: 'Patient.gender é obrigatório',
        location: 'Patient.gender',
      });
    } else if (!['male', 'female', 'other', 'unknown'].includes(resource.gender)) {
      issues.push({
        severity: 'error',
        code: 'code-invalid',
        details: `Valor inválido para gender: ${resource.gender}`,
        location: 'Patient.gender',
      });
    }

    // birthDate é obrigatório
    if (!resource.birthDate) {
      issues.push({
        severity: 'error',
        code: 'required',
        details: 'Patient.birthDate é obrigatório',
        location: 'Patient.birthDate',
      });
    }
  }

  /**
   * Valida recurso Condition (gravidez)
   */
  private validateCondition(resource: any, issues: ValidationIssue[]): void {
    // code é obrigatório
    if (!resource.code) {
      issues.push({
        severity: 'error',
        code: 'required',
        details: 'Condition.code é obrigatório',
        location: 'Condition.code',
      });
    } else {
      // Para gravidez, validar código SNOMED CT
      const hasPregancyCode = resource.code.coding?.some(
        (coding: any) =>
          coding.system === 'http://snomed.info/sct' &&
          coding.code === '77386006',
      );

      if (!hasPregancyCode) {
        issues.push({
          severity: 'warning',
          code: 'code-invalid',
          details:
            'Condition para gravidez deve ter código SNOMED CT 77386006',
          location: 'Condition.code.coding',
        });
      }
    }

    // subject é obrigatório
    if (!resource.subject) {
      issues.push({
        severity: 'error',
        code: 'required',
        details: 'Condition.subject é obrigatório',
        location: 'Condition.subject',
      });
    }

    // clinicalStatus é obrigatório
    if (!resource.clinicalStatus) {
      issues.push({
        severity: 'error',
        code: 'required',
        details: 'Condition.clinicalStatus é obrigatório',
        location: 'Condition.clinicalStatus',
      });
    }
  }

  /**
   * Valida recurso Observation
   */
  private validateObservation(resource: any, issues: ValidationIssue[]): void {
    // status é obrigatório
    if (!resource.status) {
      issues.push({
        severity: 'error',
        code: 'required',
        details: 'Observation.status é obrigatório',
        location: 'Observation.status',
      });
    }

    // code é obrigatório
    if (!resource.code) {
      issues.push({
        severity: 'error',
        code: 'required',
        details: 'Observation.code é obrigatório',
        location: 'Observation.code',
      });
    }

    // subject é obrigatório
    if (!resource.subject) {
      issues.push({
        severity: 'error',
        code: 'required',
        details: 'Observation.subject é obrigatório',
        location: 'Observation.subject',
      });
    }

    // effective[x] é obrigatório
    if (!resource.effectiveDateTime && !resource.effectivePeriod) {
      issues.push({
        severity: 'error',
        code: 'required',
        details: 'Observation.effective[x] é obrigatório',
        location: 'Observation.effective[x]',
      });
    }

    // value[x] ou dataAbsentReason é obrigatório
    if (
      !resource.valueQuantity &&
      !resource.valueCodeableConcept &&
      !resource.valueString &&
      !resource.valueBoolean &&
      !resource.valueInteger &&
      !resource.valueRange &&
      !resource.valueRatio &&
      !resource.valueSampledData &&
      !resource.valueTime &&
      !resource.valueDateTime &&
      !resource.valuePeriod &&
      !resource.component &&
      !resource.dataAbsentReason
    ) {
      issues.push({
        severity: 'warning',
        code: 'required',
        details: 'Observation deve ter value[x] ou dataAbsentReason',
        location: 'Observation.value[x]',
      });
    }
  }

  /**
   * Valida recurso CarePlan
   */
  private validateCarePlan(resource: any, issues: ValidationIssue[]): void {
    // status é obrigatório
    if (!resource.status) {
      issues.push({
        severity: 'error',
        code: 'required',
        details: 'CarePlan.status é obrigatório',
        location: 'CarePlan.status',
      });
    }

    // intent é obrigatório
    if (!resource.intent) {
      issues.push({
        severity: 'error',
        code: 'required',
        details: 'CarePlan.intent é obrigatório',
        location: 'CarePlan.intent',
      });
    }

    // subject é obrigatório
    if (!resource.subject) {
      issues.push({
        severity: 'error',
        code: 'required',
        details: 'CarePlan.subject é obrigatório',
        location: 'CarePlan.subject',
      });
    }
  }

  /**
   * Valida Bundle
   */
  private validateBundle(resource: any, issues: ValidationIssue[]): void {
    // type é obrigatório
    if (!resource.type) {
      issues.push({
        severity: 'error',
        code: 'required',
        details: 'Bundle.type é obrigatório',
        location: 'Bundle.type',
      });
    }

    // entry é obrigatório para bundles transacionais
    if (
      (resource.type === 'transaction' || resource.type === 'batch') &&
      (!resource.entry || resource.entry.length === 0)
    ) {
      issues.push({
        severity: 'error',
        code: 'required',
        details: 'Bundle transacional/batch deve ter ao menos uma entry',
        location: 'Bundle.entry',
      });
    }

    // Validar cada entry
    if (resource.entry) {
      resource.entry.forEach((entry: any, index: number) => {
        // resource é obrigatório
        if (!entry.resource) {
          issues.push({
            severity: 'error',
            code: 'required',
            details: `Bundle.entry[${index}].resource é obrigatório`,
            location: `Bundle.entry[${index}].resource`,
          });
        }

        // request é obrigatório para transaction/batch
        if (
          (resource.type === 'transaction' || resource.type === 'batch') &&
          !entry.request
        ) {
          issues.push({
            severity: 'error',
            code: 'required',
            details: `Bundle.entry[${index}].request é obrigatório para bundles transacionais`,
            location: `Bundle.entry[${index}].request`,
          });
        }
      });
    }
  }

  /**
   * Valida conformidade com profile brasileiro
   */
  private validateProfile(
    resource: any,
    profileUrl: string,
    issues: ValidationIssue[],
  ): void {
    // Verificar se meta.profile inclui o profile esperado
    if (!resource.meta?.profile?.includes(profileUrl)) {
      issues.push({
        severity: 'warning',
        code: 'profile',
        details: `Recurso não declara conformidade com profile ${profileUrl}`,
        location: 'meta.profile',
        diagnostics: `Esperado profile: ${profileUrl}`,
      });
    }

    // Validações específicas por profile
    if (
      profileUrl.includes('BRIndividuo') &&
      resource.resourceType === 'Patient'
    ) {
      // BRIndividuo-1.0 requer CPF ou CNS
      const hasCpfOrCns = resource.identifier?.some(
        (id: any) =>
          id.system ===
            'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf' ||
          id.system ===
            'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns',
      );

      if (!hasCpfOrCns) {
        issues.push({
          severity: 'error',
          code: 'profile',
          details: 'BRIndividuo-1.0 requer CPF ou CNS como identifier',
          location: 'Patient.identifier',
        });
      }
    }
  }

  /**
   * Determina severidade geral baseada nos issues
   */
  private determineSeverity(
    issues: ValidationIssue[],
  ): 'fatal' | 'error' | 'warning' | 'information' | 'success' {
    if (issues.length === 0) {
      return 'success';
    }

    const hasFatal = issues.some((issue) => issue.severity === 'fatal');
    if (hasFatal) return 'fatal';

    const hasError = issues.some((issue) => issue.severity === 'error');
    if (hasError) return 'error';

    const hasWarning = issues.some((issue) => issue.severity === 'warning');
    if (hasWarning) return 'warning';

    return 'information';
  }

  /**
   * Converte resultado de validação para OperationOutcome FHIR
   */
  toOperationOutcome(result: ValidationResult): any {
    return {
      resourceType: 'OperationOutcome',
      issue: result.issues.map((issue) => ({
        severity: issue.severity,
        code: issue.code,
        details: {
          text: issue.details,
        },
        diagnostics: issue.diagnostics,
        location: issue.location ? [issue.location] : undefined,
        expression: issue.expression,
      })),
    };
  }
}
