import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SyncService } from '../sync/sync.service';

/**
 * Worker de Sincronização Automática
 * Executa sincronização periódica de gestantes ativas do Core Service
 */
@Injectable()
export class SyncWorker {
  private readonly logger = new Logger(SyncWorker.name);
  private coreServiceUrl: string;
  private isRunning = false;

  constructor(
    private readonly syncService: SyncService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.coreServiceUrl = this.configService.get<string>(
      'CORE_SERVICE_URL',
      'http://localhost:3001',
    );
  }

  /**
   * Cron job que executa a cada 30 minutos
   * Sincroniza todas as gestantes ativas do Core Service
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleSyncActivePregnancies() {
    // Prevenir execuções concorrentes
    if (this.isRunning) {
      this.logger.warn('Sync job já está em execução, pulando esta execução');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      this.logger.log('🔄 Iniciando sincronização automática de gestantes ativas');

      // 1. Buscar pregnancies ativas do Core Service
      const pregnancies = await this.fetchActivePregnancies();

      if (pregnancies.length === 0) {
        this.logger.log('Nenhuma gestante ativa encontrada para sincronizar');
        return;
      }

      this.logger.log(`Encontradas ${pregnancies.length} gestantes ativas`);

      // 2. Sincronizar cada gestante
      let successCount = 0;
      let errorCount = 0;

      for (const pregnancy of pregnancies) {
        try {
          const cpf = pregnancy.citizen?.cpf;

          if (!cpf) {
            this.logger.warn(
              `Pregnancy ${pregnancy.id} não possui CPF da cidadã, pulando`,
            );
            errorCount++;
            continue;
          }

          this.logger.debug(`Sincronizando cidadã com CPF: ${cpf}`);
          await this.syncService.syncPatientComplete(cpf);

          successCount++;
          this.logger.debug(`✅ Cidadã ${cpf} sincronizada com sucesso`);
        } catch (error) {
          errorCount++;
          this.logger.error(
            `❌ Erro ao sincronizar pregnancy ${pregnancy.id}: ${error.message}`,
          );
          // Continuar para próxima pregnancy mesmo em caso de erro
        }
      }

      // 3. Log final do resultado
      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ Sincronização concluída em ${duration}ms: ${successCount} sucessos, ${errorCount} erros`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erro crítico na sincronização automática: ${error.message}`,
        error.stack,
      );
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Cron job manual para sincronização imediata (a cada 5 minutos em horário comercial)
   * Útil para testes e desenvolvimento
   */
  @Cron('0 */5 8-18 * * 1-5') // A cada 5 minutos, das 8h às 18h, segunda a sexta
  async handleQuickSync() {
    this.logger.debug('Quick sync disparado (modo desenvolvimento)');
    // Implementação futura se necessário
  }

  /**
   * Busca pregnancies ativas do Core Service
   */
  private async fetchActivePregnancies(): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.coreServiceUrl}/api/pregnancies`, {
          params: {
            status: 'active',
            limit: 1000, // Limitar para evitar sobrecarga
          },
        }),
      );

      return response.data || [];
    } catch (error) {
      this.logger.error(
        `Erro ao buscar pregnancies do Core Service: ${error.message}`,
      );

      // Se Core Service estiver indisponível, retornar array vazio
      if (error.code === 'ECONNREFUSED') {
        this.logger.warn('Core Service indisponível, pulando sincronização');
        return [];
      }

      throw error;
    }
  }

  /**
   * Força uma sincronização manual (útil para testes)
   */
  async triggerManualSync(): Promise<void> {
    this.logger.log('Sincronização manual disparada');
    await this.handleSyncActivePregnancies();
  }
}
