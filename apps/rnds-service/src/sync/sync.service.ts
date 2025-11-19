import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FhirClientService } from '../fhir/fhir-client.service';
import { SyncCursor } from '../entities/sync-cursor.entity';
import { SyncError } from '../entities/sync-error.entity';
import {
  mapPatientToCitizen,
  mapConditionToPregnancy,
  mapObservationToClinicalObservation,
} from '../mappers/fhir-to-domain.mapper';

/**
 * Serviço de Sincronização Incremental com RNDS
 * Implementa leitura de dados da RNDS com cursor tracking
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly fhirClient: FhirClientService,
    @InjectRepository(SyncCursor)
    private readonly syncCursorRepository: Repository<SyncCursor>,
    @InjectRepository(SyncError)
    private readonly syncErrorRepository: Repository<SyncError>,
  ) {}

  /**
   * Sincroniza um paciente (cidadã) da RNDS
   * Usa sincronização incremental baseada em cursor (_lastUpdated)
   */
  async syncPatient(cpf: string): Promise<any> {
    this.logger.log(`Iniciando sincronização de Patient com CPF: ${cpf}`);

    try {
      // 1. Buscar ou criar cursor
      const cursor = await this.getOrCreateCursor('Patient', cpf);

      // 2. Montar query com _lastUpdated se houver cursor
      const identifier = `http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf|${cpf}`;
      let searchParams = `identifier=${identifier}`;

      if (cursor.lastSyncedAt) {
        const lastUpdated = cursor.lastSyncedAt.toISOString();
        searchParams += `&_lastUpdated=ge${lastUpdated}`;
      }

      // 3. Buscar da RNDS
      const bundle = await this.fhirClient.searchPatient(searchParams);

      // 4. Processar resultados
      if (!bundle.entry || bundle.entry.length === 0) {
        this.logger.log(`Nenhum paciente encontrado ou atualizado para CPF: ${cpf}`);
        cursor.markSynced();
        await this.syncCursorRepository.save(cursor);
        return { synced: false, message: 'No updates found' };
      }

      const patients = [];
      for (const entry of bundle.entry) {
        const fhirPatient = entry.resource;

        // Mapear FHIR → Domínio
        const citizenData = mapPatientToCitizen(fhirPatient);

        patients.push({
          fhirId: fhirPatient.id,
          citizenData,
        });
      }

      // 5. Atualizar cursor
      cursor.markSynced(bundle.entry[0].resource.id, bundle.entry[0].resource.meta?.versionId);
      await this.syncCursorRepository.save(cursor);

      this.logger.log(`Sincronizado ${patients.length} paciente(s) para CPF: ${cpf}`);

      return {
        synced: true,
        count: patients.length,
        patients,
        nextLink: this.getNextLink(bundle),
      };
    } catch (error) {
      this.logger.error(`Erro ao sincronizar Patient CPF ${cpf}:`, error);

      await this.logSyncError({
        operation: 'pull',
        resourceType: 'Patient',
        resourceId: cpf,
        errorMessage: error.message,
        errorCode: error.response?.status?.toString(),
        context: { cpf },
      });

      throw error;
    }
  }

  /**
   * Sincroniza condições (gravidez) de uma paciente
   */
  async syncConditions(patientId: string): Promise<any> {
    this.logger.log(`Sincronizando Conditions para Patient: ${patientId}`);

    try {
      const cursor = await this.getOrCreateCursor('Condition', patientId);

      let searchParams = `patient=${patientId}&code=http://snomed.info/sct|77386006`;

      if (cursor.lastSyncedAt) {
        const lastUpdated = cursor.lastSyncedAt.toISOString();
        searchParams += `&_lastUpdated=ge${lastUpdated}`;
      }

      const bundle = await this.fhirClient.searchConditions(searchParams);

      if (!bundle.entry || bundle.entry.length === 0) {
        cursor.markSynced();
        await this.syncCursorRepository.save(cursor);
        return { synced: false, message: 'No conditions found' };
      }

      const pregnancies = [];
      for (const entry of bundle.entry) {
        const fhirCondition = entry.resource;

        const pregnancyData = mapConditionToPregnancy(fhirCondition, patientId);

        pregnancies.push({
          fhirId: fhirCondition.id,
          pregnancyData,
        });
      }

      cursor.markSynced(bundle.entry[0].resource.id, bundle.entry[0].resource.meta?.versionId);
      await this.syncCursorRepository.save(cursor);

      this.logger.log(`Sincronizado ${pregnancies.length} gravidez(es) para Patient: ${patientId}`);

      return {
        synced: true,
        count: pregnancies.length,
        pregnancies,
        nextLink: this.getNextLink(bundle),
      };
    } catch (error) {
      this.logger.error(`Erro ao sincronizar Conditions para Patient ${patientId}:`, error);

      await this.logSyncError({
        operation: 'pull',
        resourceType: 'Condition',
        resourceId: patientId,
        errorMessage: error.message,
        errorCode: error.response?.status?.toString(),
        context: { patientId },
      });

      throw error;
    }
  }

  /**
   * Sincroniza observações clínicas de uma paciente
   */
  async syncObservations(patientId: string, category?: string): Promise<any> {
    this.logger.log(`Sincronizando Observations para Patient: ${patientId}`);

    try {
      const cursorIdentifier = category ? `${patientId}-${category}` : patientId;
      const cursor = await this.getOrCreateCursor('Observation', cursorIdentifier);

      let searchParams = `patient=${patientId}`;

      if (category) {
        searchParams += `&category=${category}`;
      }

      if (cursor.lastSyncedAt) {
        const lastUpdated = cursor.lastSyncedAt.toISOString();
        searchParams += `&_lastUpdated=ge${lastUpdated}`;
      }

      const bundle = await this.fhirClient.searchObservations(searchParams);

      if (!bundle.entry || bundle.entry.length === 0) {
        cursor.markSynced();
        await this.syncCursorRepository.save(cursor);
        return { synced: false, message: 'No observations found' };
      }

      const observations = [];
      for (const entry of bundle.entry) {
        const fhirObservation = entry.resource;

        const observationData = mapObservationToClinicalObservation(
          fhirObservation,
          patientId,
          null, // pregnancyId será mapeado depois
        );

        observations.push({
          fhirId: fhirObservation.id,
          observationData,
        });
      }

      cursor.markSynced(
        bundle.entry[0].resource.id,
        bundle.entry[0].resource.meta?.versionId,
      );
      await this.syncCursorRepository.save(cursor);

      this.logger.log(
        `Sincronizado ${observations.length} observação(ões) para Patient: ${patientId}`,
      );

      return {
        synced: true,
        count: observations.length,
        observations,
        nextLink: this.getNextLink(bundle),
      };
    } catch (error) {
      this.logger.error(`Erro ao sincronizar Observations para Patient ${patientId}:`, error);

      await this.logSyncError({
        operation: 'pull',
        resourceType: 'Observation',
        resourceId: patientId,
        errorMessage: error.message,
        errorCode: error.response?.status?.toString(),
        context: { patientId, category },
      });

      throw error;
    }
  }

  /**
   * Sincroniza múltiplas páginas de resultados seguindo link.next
   */
  async syncAllPages(initialBundle: any, mapperFn: (entry: any) => any): Promise<any[]> {
    const allResults = [];
    let currentBundle = initialBundle;

    while (currentBundle) {
      // Processar entradas da página atual
      if (currentBundle.entry) {
        for (const entry of currentBundle.entry) {
          const mapped = mapperFn(entry);
          allResults.push(mapped);
        }
      }

      // Verificar se há próxima página
      const nextLink = this.getNextLink(currentBundle);
      if (!nextLink) {
        break;
      }

      this.logger.log(`Buscando próxima página: ${nextLink}`);

      // Buscar próxima página
      // TODO: Implementar método no FhirClientService para buscar URL completa
      currentBundle = null; // Por enquanto, processar apenas primeira página
    }

    return allResults;
  }

  /**
   * Sincroniza dados completos de uma paciente (Patient + Conditions + Observations)
   */
  async syncPatientComplete(cpf: string): Promise<any> {
    this.logger.log(`Sincronização completa para CPF: ${cpf}`);

    try {
      // 1. Sincronizar Patient
      const patientResult = await this.syncPatient(cpf);

      if (!patientResult.synced || !patientResult.patients?.length) {
        return {
          success: false,
          message: 'Patient not found',
        };
      }

      const patientId = patientResult.patients[0].fhirId;

      // 2. Sincronizar Conditions (gravidez)
      const conditionsResult = await this.syncConditions(patientId);

      // 3. Sincronizar Observations (vital-signs e laboratory)
      const vitalSignsResult = await this.syncObservations(patientId, 'vital-signs');
      const laboratoryResult = await this.syncObservations(patientId, 'laboratory');

      return {
        success: true,
        patient: patientResult.patients[0],
        pregnancies: conditionsResult.pregnancies || [],
        vitalSigns: vitalSignsResult.observations || [],
        laboratory: laboratoryResult.observations || [],
      };
    } catch (error) {
      this.logger.error(`Erro na sincronização completa para CPF ${cpf}:`, error);
      throw error;
    }
  }

  // Helper methods

  /**
   * Busca ou cria um cursor de sincronização
   */
  private async getOrCreateCursor(
    resourceType: string,
    identifier: string,
  ): Promise<SyncCursor> {
    let cursor = await this.syncCursorRepository.findOne({
      where: { resourceType, identifier },
    });

    if (!cursor) {
      cursor = this.syncCursorRepository.create({
        resourceType,
        identifier,
        lastSyncedAt: new Date(0), // Epoch, para pegar todos desde o início
        status: 'pending',
        syncDirection: 'pull',
      });
    }

    return cursor;
  }

  /**
   * Extrai link de próxima página do Bundle
   */
  private getNextLink(bundle: any): string | null {
    if (!bundle.link) return null;

    const nextLink = bundle.link.find((link: any) => link.relation === 'next');
    return nextLink?.url || null;
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

    if (code >= 400 && code < 500) return 'client';
    if (code >= 500 && code < 600) return 'server';
    if (code === 408 || code === 504) return 'timeout';

    return 'unknown';
  }
}
