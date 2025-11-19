import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FhirClientService } from '../fhir/fhir-client.service';
import { PublishLog } from '../entities/publish-log.entity';
import { SyncError } from '../entities/sync-error.entity';
import { FhirValidatorService } from '../validation/fhir-validator.service';
import {
  mapCitizenToPatient,
  mapPregnancyToCondition,
  mapPregnancyToCarePlan,
  mapClinicalObservationToObservation,
  createTransactionBundle,
} from '../mappers/domain-to-fhir.mapper';
import { v4 as uuidv4 } from 'uuid';

/**
 * Serviço de Publicação Transacional para RNDS
 * Implementa envio de dados para RNDS com bundles transacionais
 */
@Injectable()
export class PublishService {
  private readonly logger = new Logger(PublishService.name);

  constructor(
    private readonly fhirClient: FhirClientService,
    private readonly fhirValidator: FhirValidatorService,
    @InjectRepository(PublishLog)
    private readonly publishLogRepository: Repository<PublishLog>,
    @InjectRepository(SyncError)
    private readonly syncErrorRepository: Repository<SyncError>,
  ) {}

  /**
   * Publica dados de uma cidadã (Patient) na RNDS
   */
  async publishCitizen(citizenData: any): Promise<any> {
    this.logger.log(`Publicando Patient para cidadã: ${citizenData.cpf}`);

    const idempotencyKey = uuidv4();
    const startTime = Date.now();

    try {
      // 1. Mapear domínio → FHIR
      const fhirPatient = mapCitizenToPatient(citizenData);

      // 2. Validar recurso FHIR
      const validationResult = await this.fhirValidator.validate(
        fhirPatient,
        'http://www.saude.gov.br/fhir/r4/StructureDefinition/BRIndividuo-1.0',
      );

      if (!validationResult.valid) {
        this.logger.error(
          `Validação falhou para Patient: ${validationResult.issues.length} erros`,
        );
        throw new BadRequestException({
          message: 'Recurso FHIR inválido',
          validationIssues: validationResult.issues,
        });
      }

      // 3. Criar log inicial
      const publishLog = this.publishLogRepository.create({
        bundleId: idempotencyKey,
        operation: 'create',
        resourceType: 'Patient',
        resourceIds: citizenData.id || citizenData.cpf,
        status: 'pending',
        resourceCount: 1,
        request: {
          method: 'POST',
          url: '/Patient',
          headers: { 'Idempotency-Key': idempotencyKey },
          body: fhirPatient,
        },
      });

      publishLog.markSent();
      await this.publishLogRepository.save(publishLog);

      // 4. Enviar para RNDS
      const response = await this.fhirClient.createResource(
        'Patient',
        fhirPatient,
        idempotencyKey,
      );

      // 5. Atualizar log com sucesso
      const responseTime = Date.now() - startTime;
      publishLog.markSuccess(
        {
          statusCode: 201,
          headers: {},
          body: response,
        },
        responseTime,
      );
      await this.publishLogRepository.save(publishLog);

      this.logger.log(`Patient publicado com sucesso: ${response.id}`);

      return {
        success: true,
        externalId: response.id,
        versionId: response.meta?.versionId,
      };
    } catch (error) {
      this.logger.error(`Erro ao publicar Patient para ${citizenData.cpf}:`, error);

      // Atualizar log com erro
      const publishLog = await this.publishLogRepository.findOne({
        where: { bundleId: idempotencyKey },
      });

      if (publishLog) {
        publishLog.markFailed(
          error.message,
          error.response?.status?.toString(),
          error.response?.data
            ? {
                statusCode: error.response.status,
                headers: {},
                body: error.response.data,
              }
            : null,
        );
        await this.publishLogRepository.save(publishLog);
      }

      // Registrar erro de sincronização
      await this.logSyncError({
        operation: 'push',
        resourceType: 'Patient',
        resourceId: citizenData.id || citizenData.cpf,
        errorMessage: error.message,
        errorCode: error.response?.status?.toString(),
        context: { cpf: citizenData.cpf },
      });

      throw error;
    }
  }

  /**
   * Publica uma gravidez (Condition + CarePlan) como bundle transacional
   */
  async publishPregnancy(pregnancyData: any): Promise<any> {
    this.logger.log(
      `Publicando Pregnancy (Condition + CarePlan) para pregnancy: ${pregnancyData.id}`,
    );

    const idempotencyKey = uuidv4();
    const startTime = Date.now();

    try {
      // 1. Mapear domínio → FHIR
      const fhirCondition = mapPregnancyToCondition(pregnancyData);
      const fhirCarePlan = mapPregnancyToCarePlan(pregnancyData);

      // 2. Validar recursos FHIR
      const conditionValidation = await this.fhirValidator.validate(fhirCondition);
      const carePlanValidation = await this.fhirValidator.validate(fhirCarePlan);

      if (!conditionValidation.valid || !carePlanValidation.valid) {
        this.logger.error('Validação falhou para bundle de gravidez');
        throw new BadRequestException({
          message: 'Recursos FHIR inválidos',
          validationIssues: [
            ...conditionValidation.issues,
            ...carePlanValidation.issues,
          ],
        });
      }

      // 3. Criar bundle transacional
      const transactionBundle = createTransactionBundle([
        fhirCondition,
        fhirCarePlan,
      ]);

      // 4. Criar log inicial
      const publishLog = this.publishLogRepository.create({
        bundleId: idempotencyKey,
        operation: 'transaction',
        resourceType: 'Bundle',
        resourceIds: pregnancyData.id,
        status: 'pending',
        resourceCount: 2,
        request: {
          method: 'POST',
          url: '/',
          headers: { 'Idempotency-Key': idempotencyKey },
          body: transactionBundle,
        },
      });

      publishLog.markSent();
      await this.publishLogRepository.save(publishLog);

      // 5. Enviar bundle transacional para RNDS
      const response = await this.fhirClient.postBundle(
        transactionBundle,
        idempotencyKey,
      );

      // 6. Extrair IDs dos recursos criados
      const conditionEntry = response.entry?.find(
        (e: any) => e.response?.status?.startsWith('201'),
      );
      const conditionId = conditionEntry?.response?.location?.split('/')[1];

      // 7. Atualizar log com sucesso
      const responseTime = Date.now() - startTime;
      publishLog.markSuccess(
        {
          statusCode: 200,
          headers: {},
          body: response,
        },
        responseTime,
      );
      await this.publishLogRepository.save(publishLog);

      this.logger.log(
        `Pregnancy publicada com sucesso. Condition ID: ${conditionId}`,
      );

      return {
        success: true,
        conditionId,
        bundleResponse: response,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao publicar Pregnancy ${pregnancyData.id}:`,
        error,
      );

      // Atualizar log com erro
      const publishLog = await this.publishLogRepository.findOne({
        where: { bundleId: idempotencyKey },
      });

      if (publishLog) {
        publishLog.markFailed(
          error.message,
          error.response?.status?.toString(),
          error.response?.data
            ? {
                statusCode: error.response.status,
                headers: {},
                body: error.response.data,
              }
            : null,
        );
        await this.publishLogRepository.save(publishLog);
      }

      // Registrar erro de sincronização
      await this.logSyncError({
        operation: 'push',
        resourceType: 'Condition',
        resourceId: pregnancyData.id,
        errorMessage: error.message,
        errorCode: error.response?.status?.toString(),
        context: { pregnancyId: pregnancyData.id },
      });

      // Tratar erros específicos do FHIR
      this.handleFhirError(error);

      throw error;
    }
  }

  /**
   * Publica observações clínicas (batch ou transacional)
   */
  async publishObservations(
    observations: any[],
    useTransaction = false,
  ): Promise<any> {
    this.logger.log(
      `Publicando ${observations.length} Observations (${useTransaction ? 'transaction' : 'batch'})`,
    );

    const idempotencyKey = uuidv4();
    const startTime = Date.now();

    try {
      // 1. Mapear domínio → FHIR
      const fhirObservations = observations.map((obs) =>
        mapClinicalObservationToObservation(obs),
      );

      // 2. Criar bundle
      const bundle = useTransaction
        ? createTransactionBundle(fhirObservations)
        : this.createBatchBundle(fhirObservations);

      // 3. Criar log inicial
      const publishLog = this.publishLogRepository.create({
        bundleId: idempotencyKey,
        operation: useTransaction ? 'transaction' : 'batch',
        resourceType: 'Bundle',
        resourceIds: observations.map((o) => o.id).join(','),
        status: 'pending',
        resourceCount: observations.length,
        request: {
          method: 'POST',
          url: '/',
          headers: { 'Idempotency-Key': idempotencyKey },
          body: bundle,
        },
      });

      publishLog.markSent();
      await this.publishLogRepository.save(publishLog);

      // 4. Enviar bundle para RNDS
      const response = await this.fhirClient.postBundle(bundle, idempotencyKey);

      // 5. Processar respostas
      const results = {
        total: observations.length,
        successful: 0,
        failed: 0,
        entries: [],
      };

      if (response.entry) {
        for (let i = 0; i < response.entry.length; i++) {
          const entry = response.entry[i];
          const isSuccess = entry.response?.status?.startsWith('20');

          if (isSuccess) {
            results.successful++;
          } else {
            results.failed++;
          }

          results.entries.push({
            index: i,
            status: entry.response?.status,
            location: entry.response?.location,
            outcome: entry.response?.outcome,
          });
        }
      }

      // 6. Atualizar log
      const responseTime = Date.now() - startTime;

      if (results.failed > 0) {
        publishLog.markPartial(
          results.successful,
          results.failed,
          {
            statusCode: 200,
            headers: {},
            body: response,
          },
        );
      } else {
        publishLog.markSuccess(
          {
            statusCode: 200,
            headers: {},
            body: response,
          },
          responseTime,
        );
      }

      await this.publishLogRepository.save(publishLog);

      this.logger.log(
        `Observations publicadas: ${results.successful}/${results.total} sucesso`,
      );

      return {
        success: true,
        results,
        bundleResponse: response,
      };
    } catch (error) {
      this.logger.error(`Erro ao publicar Observations:`, error);

      // Atualizar log com erro
      const publishLog = await this.publishLogRepository.findOne({
        where: { bundleId: idempotencyKey },
      });

      if (publishLog) {
        publishLog.markFailed(
          error.message,
          error.response?.status?.toString(),
          error.response?.data
            ? {
                statusCode: error.response.status,
                headers: {},
                body: error.response.data,
              }
            : null,
        );
        await this.publishLogRepository.save(publishLog);
      }

      // Registrar erro de sincronização
      await this.logSyncError({
        operation: 'push',
        resourceType: 'Observation',
        resourceId: null,
        errorMessage: error.message,
        errorCode: error.response?.status?.toString(),
        context: { observationsCount: observations.length },
      });

      this.handleFhirError(error);

      throw error;
    }
  }

  /**
   * Retry de publicação falhada usando bundleId
   */
  async retryPublish(publishLogId: string): Promise<any> {
    this.logger.log(`Tentando retry de publicação: ${publishLogId}`);

    const originalLog = await this.publishLogRepository.findOne({
      where: { id: publishLogId },
    });

    if (!originalLog) {
      throw new Error(`PublishLog não encontrado: ${publishLogId}`);
    }

    if (originalLog.status === 'success') {
      this.logger.warn(`PublishLog ${publishLogId} já foi bem-sucedido`);
      return { success: true, message: 'Already successful' };
    }

    if (!originalLog.shouldRetry()) {
      this.logger.warn(
        `PublishLog ${publishLogId} não deve ser retentado (código de erro: ${originalLog.errorCode})`,
      );
      return { success: false, message: 'Should not retry' };
    }

    const startTime = Date.now();

    try {
      // Criar novo log de retry
      const retryLog = this.publishLogRepository.create({
        ...originalLog,
        id: undefined,
        createdAt: undefined,
        isRetry: true,
        originalLogId: publishLogId,
        status: 'pending',
        sentAt: null,
        receivedAt: null,
        responseTime: null,
        response: null,
        errorMessage: null,
        errorCode: null,
      });

      retryLog.markSent();
      await this.publishLogRepository.save(retryLog);

      // Reenviar com mesmo idempotencyKey do request original (garantindo idempotência)
      const response = await this.fhirClient.postBundle(
        originalLog.request.body,
        originalLog.request.headers['Idempotency-Key'],
      );

      // Atualizar log com sucesso
      const responseTime = Date.now() - startTime;
      retryLog.markSuccess(
        {
          statusCode: 200,
          headers: {},
          body: response,
        },
        responseTime,
      );
      await this.publishLogRepository.save(retryLog);

      this.logger.log(`Retry bem-sucedido para PublishLog ${publishLogId}`);

      return {
        success: true,
        response,
      };
    } catch (error) {
      this.logger.error(`Erro no retry de PublishLog ${publishLogId}:`, error);

      throw error;
    }
  }

  // Helper methods

  /**
   * Cria batch bundle (para operações independentes)
   */
  private createBatchBundle(resources: any[]): any {
    return {
      resourceType: 'Bundle',
      type: 'batch',
      entry: resources.map((resource) => ({
        request: {
          method: 'POST',
          url: resource.resourceType,
        },
        resource,
      })),
    };
  }

  /**
   * Trata erros específicos do FHIR
   */
  private handleFhirError(error: any): void {
    const status = error.response?.status;

    switch (status) {
      case 422:
        this.logger.error('Erro de validação FHIR (422 Unprocessable Entity)');
        // Extrair OperationOutcome se disponível
        if (error.response?.data?.issue) {
          error.response.data.issue.forEach((issue: any) => {
            this.logger.error(
              `  - ${issue.severity}: ${issue.diagnostics}`,
            );
          });
        }
        break;

      case 409:
        this.logger.warn('Conflito: Recurso já existe (409 Conflict)');
        break;

      case 412:
        this.logger.warn(
          'Precondição falhou: Versão do recurso não corresponde (412 Precondition Failed)',
        );
        break;

      case 401:
        this.logger.error('Erro de autenticação (401 Unauthorized)');
        break;

      case 403:
        this.logger.error('Acesso negado (403 Forbidden)');
        break;

      default:
        this.logger.error(`Erro HTTP ${status}: ${error.message}`);
    }
  }

  /**
   * Registra erro de sincronização
   */
  private async logSyncError(errorData: {
    operation: 'push' | 'pull' | 'validation' | 'mapping' | 'network' | 'auth';
    resourceType: string;
    resourceId: string | null;
    errorMessage: string;
    errorCode?: string;
    context?: any;
  }): Promise<void> {
    try {
      const syncError = this.syncErrorRepository.create({
        ...errorData,
        errorType: this.categorizeErrorType(errorData.errorCode),
        severity: 'error',
        status: 'open',
      });

      syncError.categorizeError();

      if (syncError.isTemporary()) {
        syncError.scheduleRetry();
      }

      await this.syncErrorRepository.save(syncError);
    } catch (error) {
      this.logger.error('Erro ao salvar SyncError:', error);
    }
  }

  /**
   * Categoriza tipo de erro baseado no código HTTP
   */
  private categorizeErrorType(
    errorCode?: string,
  ): 'client' | 'server' | 'validation' | 'business' | 'timeout' | 'unknown' {
    if (!errorCode) return 'unknown';

    const code = parseInt(errorCode, 10);

    if (isNaN(code)) return 'unknown';

    if (code === 422) return 'validation';
    if (code >= 400 && code < 500) return 'client';
    if (code >= 500 && code < 600) return 'server';
    if (code === 408 || code === 504) return 'timeout';

    return 'unknown';
  }
}
