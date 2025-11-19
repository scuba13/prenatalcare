import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { SyncWorker } from './sync.worker';
import { PublishWorker } from './publish.worker';
import { RetryWorker } from './retry.worker';
import { SyncError } from '../entities/sync-error.entity';
import { SyncModule } from '../sync/sync.module';
import { PublishModule } from '../publish/publish.module';
import { MessagingModule } from '../messaging/messaging.module';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { Logger } from '@nestjs/common';

/**
 * Módulo de Workers
 * Centraliza todos os workers de background (cron jobs, queue consumers)
 */
@Module({
  imports: [
    // ScheduleModule para cron jobs
    ScheduleModule.forRoot(),

    // TypeORM para acesso ao banco de dados
    TypeOrmModule.forFeature([SyncError]),

    // HttpModule para chamadas HTTP (ex: Core Service)
    HttpModule.register({
      timeout: 30000, // 30s timeout
      maxRedirects: 5,
    }),

    // Módulos de serviços necessários
    SyncModule,
    PublishModule,
    MessagingModule,
  ],
  providers: [SyncWorker, PublishWorker, RetryWorker],
  exports: [SyncWorker, PublishWorker, RetryWorker],
})
export class WorkersModule implements OnModuleInit {
  private readonly logger = new Logger(WorkersModule.name);

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly publishWorker: PublishWorker,
  ) {}

  async onModuleInit() {
    // Configurar consumers RabbitMQ
    await this.setupConsumers();
  }

  private async setupConsumers() {
    // Só configurar se RabbitMQ estiver conectado
    if (!this.rabbitMQService.isConnected()) {
      this.logger.warn('RabbitMQ não conectado, consumers não configurados');
      return;
    }

    try {
      const queues = this.rabbitMQService.getQueues();

      // Consumer para fila de publicação
      await this.rabbitMQService.consume(
        queues.publishBundle,
        async (message) => {
          this.logger.debug('Mensagem recebida na fila de publicação');

          // Processar diferentes tipos de mensagens
          if (message.type === 'citizen') {
            await this.publishWorker.handlePublishCitizen(message);
          } else if (message.type === 'pregnancy') {
            await this.publishWorker.handlePublishPregnancy(message);
          } else {
            this.logger.warn(`Tipo de mensagem desconhecido: ${message.type}`);
          }
        },
      );

      this.logger.log('✅ RabbitMQ consumers configurados');
    } catch (error) {
      this.logger.error(
        `Erro ao configurar consumers: ${error.message}`,
      );
    }
  }
}
