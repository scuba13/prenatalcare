import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { SyncError } from '../entities/sync-error.entity';
import { SyncService } from '../sync/sync.service';
import { PublishService } from '../publish/publish.service';

/**
 * Worker de Retry/Reprocessamento
 * Busca erros de sincronização/publicação e tenta reprocessar com backoff
 */
@Injectable()
export class RetryWorker {
  private readonly logger = new Logger(RetryWorker.name);
  private readonly MAX_RETRY_COUNT = 3;
  private isRunning = false;

  constructor(
    @InjectRepository(SyncError)
    private readonly syncErrorRepository: Repository<SyncError>,
    private readonly syncService: SyncService,
    private readonly publishService: PublishService,
  ) {}

  /**
   * Cron job que executa a cada 15 minutos
   * Reprocessa erros que ainda não atingiram o limite de tentativas
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleRetryErrors() {
    // Prevenir execuções concorrentes
    if (this.isRunning) {
      this.logger.warn('Retry job já está em execução, pulando esta execução');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      this.logger.log('🔄 Iniciando reprocessamento de erros');

      // 1. Buscar erros elegíveis para retry
      const errors = await this.findRetryableErrors();

      if (errors.length === 0) {
        this.logger.debug('Nenhum erro elegível para reprocessamento');
        return;
      }

      this.logger.log(`Encontrados ${errors.length} erros para reprocessar`);

      // 2. Processar cada erro
      let successCount = 0;
      let failCount = 0;

      for (const error of errors) {
        try {
          const shouldRetry = await this.shouldRetryError(error);

          if (!shouldRetry) {
            this.logger.debug(
              `Erro ${error.id} não está pronto para retry (aguardando backoff)`,
            );
            continue;
          }

          await this.retryError(error);
          successCount++;
          this.logger.log(`✅ Erro ${error.id} reprocessado com sucesso`);
        } catch (retryError) {
          failCount++;
          this.logger.error(
            `❌ Falha ao reprocessar erro ${error.id}: ${retryError.message}`,
          );
          await this.incrementRetryCount(error, retryError.message);
        }
      }

      // 3. Log final do resultado
      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ Reprocessamento concluído em ${duration}ms: ${successCount} sucessos, ${failCount} falhas`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erro crítico no reprocessamento: ${error.message}`,
        error.stack,
      );
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Busca erros elegíveis para retry
   * - retryCount < MAX_RETRY_COUNT
   * - Ordenados por data de criação (mais antigos primeiro)
   */
  private async findRetryableErrors(): Promise<SyncError[]> {
    return this.syncErrorRepository.find({
      where: {
        retryCount: LessThan(this.MAX_RETRY_COUNT),
      },
      order: {
        createdAt: 'ASC',
      },
      take: 50, // Processar no máximo 50 erros por vez
    });
  }

  /**
   * Verifica se o erro está pronto para retry baseado em backoff exponencial
   * Backoff: 2^retryCount minutos
   * - Tentativa 0: imediato
   * - Tentativa 1: 2 minutos
   * - Tentativa 2: 4 minutos
   * - Tentativa 3: 8 minutos
   */
  private async shouldRetryError(error: SyncError): Promise<boolean> {
    if (error.retryCount === 0) {
      return true; // Primeira tentativa, retry imediato
    }

    // Calcular backoff em minutos
    const backoffMinutes = Math.pow(2, error.retryCount);
    const backoffMs = backoffMinutes * 60 * 1000;

    // Verificar se já passou tempo suficiente desde última tentativa
    const timeSinceLastRetry = Date.now() - error.updatedAt.getTime();

    return timeSinceLastRetry >= backoffMs;
  }

  /**
   * Tenta reprocessar o erro baseado no tipo de operação
   */
  private async retryError(error: SyncError): Promise<void> {
    this.logger.log(
      `Reprocessando erro ${error.id} (tentativa ${error.retryCount + 1}/${this.MAX_RETRY_COUNT})`,
    );

    const context = error.context as any;

    switch (error.operation) {
      case 'pull':
        // Retry de pull (sync) - pode ser paciente ou dados clínicos
        await this.retryPull(context);
        break;

      case 'push':
        // Retry de push (publish)
        await this.retryPush(context);
        break;

      default:
        this.logger.warn(
          `Operação ${error.operation} não requer reprocessamento automático`,
        );
        // Para outros tipos (validation, mapping, network, auth), apenas remover o erro
        break;
    }

    // Se chegou aqui, o retry foi bem-sucedido ou não é necessário, remover o erro
    await this.syncErrorRepository.remove(error);
  }

  /**
   * Retry de operações de pull (sincronização da RNDS)
   */
  private async retryPull(context: any): Promise<void> {
    const { cpf } = context;
    if (cpf) {
      await this.syncService.syncPatientComplete(cpf);
    }
  }

  /**
   * Retry de operações de push (publicação para RNDS)
   */
  private async retryPush(context: any): Promise<void> {
    const { citizenData, pregnancyData } = context;

    if (citizenData) {
      await this.publishService.publishCitizen(citizenData);
    }

    if (pregnancyData) {
      await this.publishService.publishPregnancy(pregnancyData);
    }
  }

  /**
   * Incrementa contador de retry e atualiza mensagem de erro
   */
  private async incrementRetryCount(
    error: SyncError,
    errorMessage: string,
  ): Promise<void> {
    error.retryCount++;
    error.errorMessage = errorMessage;
    error.updatedAt = new Date();

    if (error.retryCount >= this.MAX_RETRY_COUNT) {
      this.logger.warn(
        `⚠️ Erro ${error.id} atingiu limite de ${this.MAX_RETRY_COUNT} tentativas`,
      );
    }

    await this.syncErrorRepository.save(error);
  }

  /**
   * Limpa erros antigos já processados ou que excederam o limite de retries
   * Executa diariamente à meia-noite
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldErrors() {
    this.logger.log('🧹 Limpando erros antigos');

    try {
      // Remover erros com mais de 30 dias que atingiram o limite de retries
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.syncErrorRepository
        .createQueryBuilder()
        .delete()
        .where('retryCount >= :maxRetries', {
          maxRetries: this.MAX_RETRY_COUNT,
        })
        .andWhere('createdAt < :date', { date: thirtyDaysAgo })
        .execute();

      this.logger.log(`🧹 ${result.affected || 0} erros antigos removidos`);
    } catch (error) {
      this.logger.error(`Erro ao limpar erros antigos: ${error.message}`);
    }
  }
}
