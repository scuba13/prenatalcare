import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';

/**
 * Service responsável pela comunicação com RabbitMQ.
 *
 * Arquitetura de Filas:
 * - Scheduling → Notifications: scheduling.appointment_* (created, cancelled, rescheduled)
 * - Core → Notifications: core.task_* (created, overdue)
 * - Notifications → Core: notification.status_* (sent, failed)
 *
 * Exchange: 'notifications' (tipo: topic)
 */
@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;

  private readonly exchangeName = 'notifications';
  private readonly queueNames = {
    // Inbound (outros serviços → Notifications)
    appointmentEvents: 'notifications.appointment_events',
    taskEvents: 'notifications.task_events',
    pregnancyEvents: 'notifications.pregnancy_events',
    // Outbound (Notifications → outros serviços)
    notificationStatus: 'core.notification_status',
  };

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Conecta ao RabbitMQ e configura exchanges e filas
   */
  private async connect(): Promise<void> {
    const url = this.config.get('RABBITMQ_URL', 'amqp://localhost:5672');

    this.logger.log(`Conectando ao RabbitMQ: ${url}`);

    // Cria connection manager (com auto-reconnect)
    this.connection = amqp.connect([url], {
      heartbeatIntervalInSeconds: 30,
      reconnectTimeInSeconds: 5,
    });

    this.connection.on('connect', () => {
      this.logger.log('✅ Conectado ao RabbitMQ');
    });

    this.connection.on('disconnect', (err) => {
      this.logger.error('❌ Desconectado do RabbitMQ', err.err);
    });

    // Cria channel wrapper
    this.channelWrapper = this.connection.createChannel({
      setup: async (channel: ConfirmChannel) => {
        await this.setupExchangeAndQueues(channel);
      },
    });

    await this.channelWrapper.waitForConnect();
    this.logger.log('✅ RabbitMQ channel pronto');
  }

  /**
   * Configura exchange e filas no RabbitMQ
   */
  private async setupExchangeAndQueues(
    channel: ConfirmChannel,
  ): Promise<void> {
    // 1. Cria exchange do tipo topic
    await channel.assertExchange(this.exchangeName, 'topic', {
      durable: true,
    });

    this.logger.log(`✅ Exchange '${this.exchangeName}' criado (tipo: topic)`);

    // 2. Cria fila para APPOINTMENT EVENTS (Scheduling → Notifications)
    await channel.assertQueue(this.queueNames.appointmentEvents, {
      durable: true,
      arguments: {
        'x-message-ttl': 3600000, // 1 hora
        'x-max-length': 10000,
      },
    });

    // Bind para múltiplas routing keys de appointments
    const appointmentRoutingKeys = [
      'scheduling.appointment.created',
      'scheduling.appointment.cancelled',
      'scheduling.appointment.rescheduled',
      'scheduling.appointment.confirmed',
    ];

    for (const routingKey of appointmentRoutingKeys) {
      await channel.bindQueue(
        this.queueNames.appointmentEvents,
        this.exchangeName,
        routingKey,
      );
    }

    this.logger.log(
      `✅ Fila '${this.queueNames.appointmentEvents}' criada e vinculada`,
    );

    // 3. Cria fila para TASK EVENTS (Core → Notifications)
    await channel.assertQueue(this.queueNames.taskEvents, {
      durable: true,
      arguments: {
        'x-message-ttl': 3600000,
        'x-max-length': 10000,
      },
    });

    const taskRoutingKeys = [
      'core.task.created',
      'core.task.overdue',
      'core.task.due_soon',
    ];

    for (const routingKey of taskRoutingKeys) {
      await channel.bindQueue(
        this.queueNames.taskEvents,
        this.exchangeName,
        routingKey,
      );
    }

    this.logger.log(
      `✅ Fila '${this.queueNames.taskEvents}' criada e vinculada`,
    );

    // 4. Cria fila para PREGNANCY EVENTS (Core → Notifications)
    await channel.assertQueue(this.queueNames.pregnancyEvents, {
      durable: true,
      arguments: {
        'x-message-ttl': 3600000,
        'x-max-length': 10000,
      },
    });

    await channel.bindQueue(
      this.queueNames.pregnancyEvents,
      this.exchangeName,
      'core.pregnancy.*',
    );

    this.logger.log(
      `✅ Fila '${this.queueNames.pregnancyEvents}' criada e vinculada`,
    );

    // 5. Cria fila para NOTIFICATION STATUS (Notifications → Core)
    await channel.assertQueue(this.queueNames.notificationStatus, {
      durable: true,
      arguments: {
        'x-message-ttl': 3600000,
        'x-max-length': 10000,
      },
    });

    await channel.bindQueue(
      this.queueNames.notificationStatus,
      this.exchangeName,
      'notifications.status.*',
    );

    this.logger.log(
      `✅ Fila '${this.queueNames.notificationStatus}' criada e vinculada`,
    );
  }

  /**
   * Publica mensagem no exchange
   */
  async publish(
    routingKey: string,
    message: any,
    options?: amqp.Options.Publish,
  ): Promise<void> {
    try {
      await this.channelWrapper.publish(
        this.exchangeName,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        options || {},
      );

      this.logger.debug(
        `📤 Publicado em '${routingKey}': ${JSON.stringify(message)}`,
      );
    } catch (error) {
      this.logger.error(`Falha ao publicar em '${routingKey}'`, error.stack);
      throw error;
    }
  }

  /**
   * Publica evento: Notification Sent
   */
  async publishNotificationSent(notificationData: any): Promise<void> {
    await this.publish('notifications.status.sent', {
      event: 'notification.sent',
      data: notificationData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Publica evento: Notification Failed
   */
  async publishNotificationFailed(
    error: string,
    notificationData?: any,
  ): Promise<void> {
    await this.publish('notifications.status.failed', {
      event: 'notification.failed',
      error,
      data: notificationData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Publica evento: Notification Delivered
   */
  async publishNotificationDelivered(notificationData: any): Promise<void> {
    await this.publish('notifications.status.delivered', {
      event: 'notification.delivered',
      data: notificationData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Consome mensagens de uma fila
   * Garante que a fila existe antes de consumir (previne race condition)
   */
  async consume(
    queueName: string,
    handler: (message: any) => Promise<void>,
  ): Promise<void> {
    await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
      // Garante que a fila existe antes de consumir (idempotente)
      await channel.assertQueue(queueName, {
        durable: true,
        arguments: {
          'x-message-ttl': 3600000, // 1 hora
          'x-max-length': 10000,
        },
      });

      await channel.consume(
        queueName,
        async (msg: ConsumeMessage | null) => {
          if (!msg) return;

          try {
            const content = JSON.parse(msg.content.toString());
            this.logger.debug(
              `📥 Recebido de '${queueName}': ${JSON.stringify(content)}`,
            );

            await handler(content);

            // Acknowledge message
            channel.ack(msg);
          } catch (error) {
            this.logger.error(
              `Erro ao processar mensagem de '${queueName}'`,
              error.stack,
            );

            // Reject and requeue (max 3 attempts)
            const retryCount =
              (msg.properties.headers?.['x-retry-count'] || 0) + 1;

            if (retryCount < 3) {
              channel.nack(msg, false, true); // Requeue
            } else {
              this.logger.error(
                `Máximo de tentativas atingido, descartando mensagem`,
              );
              channel.nack(msg, false, false); // Discard
            }
          }
        },
        {
          noAck: false, // Manual acknowledgement
        },
      );

      this.logger.log(`✅ Consumindo da fila '${queueName}'`);
    });
  }

  /**
   * Retorna nomes das filas (útil para consumers)
   */
  getQueueNames() {
    return this.queueNames;
  }

  /**
   * Desconecta do RabbitMQ
   */
  private async disconnect(): Promise<void> {
    try {
      await this.channelWrapper.close();
      await this.connection.close();
      this.logger.log('✅ Desconectado do RabbitMQ');
    } catch (error) {
      this.logger.error('Erro ao desconectar do RabbitMQ', error.stack);
    }
  }

  /**
   * Retorna status da conexão
   */
  isConnected(): boolean {
    return this.connection?.isConnected() ?? false;
  }
}
