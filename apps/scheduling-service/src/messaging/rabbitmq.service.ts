import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';

/**
 * Service responsável pela comunicação com RabbitMQ.
 *
 * Arquitetura de Filas:
 * - Core → Scheduling: scheduling.create_appointment, scheduling.cancel_appointment
 * - Scheduling → Core: core.appointment_confirmed, core.appointment_failed, core.appointment_updated
 *
 * Exchange: 'scheduling' (tipo: topic)
 * Routing Keys:
 * - scheduling.create (Core envia)
 * - scheduling.cancel (Core envia)
 * - core.confirmed (Scheduling envia)
 * - core.failed (Scheduling envia)
 * - core.updated (Scheduling envia)
 */
@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;

  private readonly exchangeName = 'scheduling';
  private readonly queueNames = {
    // Inbound (Core → Scheduling)
    createAppointment: 'scheduling.create_appointment',
    cancelAppointment: 'scheduling.cancel_appointment',
    // Outbound (Scheduling → Core)
    appointmentConfirmed: 'core.appointment_confirmed',
    appointmentFailed: 'core.appointment_failed',
    appointmentUpdated: 'core.appointment_updated',
    appointmentCancelled: 'core.appointment_cancelled',
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

    this.logger.log(`Connecting to RabbitMQ: ${url}`);

    // Cria connection manager (com auto-reconnect)
    this.connection = amqp.connect([url], {
      heartbeatIntervalInSeconds: 30,
      reconnectTimeInSeconds: 5,
    });

    this.connection.on('connect', () => {
      this.logger.log('✅ Connected to RabbitMQ');
    });

    this.connection.on('disconnect', (err) => {
      this.logger.error('❌ Disconnected from RabbitMQ', err.err);
    });

    // Cria channel wrapper
    this.channelWrapper = this.connection.createChannel({
      setup: async (channel: ConfirmChannel) => {
        await this.setupExchangeAndQueues(channel);
      },
    });

    await this.channelWrapper.waitForConnect();
    this.logger.log('✅ RabbitMQ channel ready');
  }

  /**
   * Configura exchange e filas no RabbitMQ
   */
  private async setupExchangeAndQueues(channel: ConfirmChannel): Promise<void> {
    // 1. Cria exchange do tipo topic
    await channel.assertExchange(this.exchangeName, 'topic', {
      durable: true,
    });

    this.logger.log(`✅ Exchange '${this.exchangeName}' created (topic)`);

    // 2. Cria fila para CREATE APPOINTMENT (Core → Scheduling)
    await channel.assertQueue(this.queueNames.createAppointment, {
      durable: true,
      arguments: {
        'x-message-ttl': 3600000, // 1 hora
        'x-max-length': 10000,
      },
    });

    await channel.bindQueue(
      this.queueNames.createAppointment,
      this.exchangeName,
      'scheduling.create',
    );

    this.logger.log(
      `✅ Queue '${this.queueNames.createAppointment}' bound to 'scheduling.create'`,
    );

    // 3. Cria fila para CANCEL APPOINTMENT (Core → Scheduling)
    await channel.assertQueue(this.queueNames.cancelAppointment, {
      durable: true,
      arguments: {
        'x-message-ttl': 3600000,
        'x-max-length': 10000,
      },
    });

    await channel.bindQueue(
      this.queueNames.cancelAppointment,
      this.exchangeName,
      'scheduling.cancel',
    );

    this.logger.log(
      `✅ Queue '${this.queueNames.cancelAppointment}' bound to 'scheduling.cancel'`,
    );

    // 4. Cria fila para APPOINTMENT CONFIRMED (Scheduling → Core)
    await channel.assertQueue(this.queueNames.appointmentConfirmed, {
      durable: true,
      arguments: {
        'x-message-ttl': 3600000,
        'x-max-length': 10000,
      },
    });

    await channel.bindQueue(
      this.queueNames.appointmentConfirmed,
      this.exchangeName,
      'core.confirmed',
    );

    this.logger.log(
      `✅ Queue '${this.queueNames.appointmentConfirmed}' bound to 'core.confirmed'`,
    );

    // 5. Cria fila para APPOINTMENT FAILED (Scheduling → Core)
    await channel.assertQueue(this.queueNames.appointmentFailed, {
      durable: true,
      arguments: {
        'x-message-ttl': 3600000,
        'x-max-length': 10000,
      },
    });

    await channel.bindQueue(
      this.queueNames.appointmentFailed,
      this.exchangeName,
      'core.failed',
    );

    this.logger.log(
      `✅ Queue '${this.queueNames.appointmentFailed}' bound to 'core.failed'`,
    );

    // 6. Cria fila para APPOINTMENT UPDATED (Scheduling → Core)
    await channel.assertQueue(this.queueNames.appointmentUpdated, {
      durable: true,
      arguments: {
        'x-message-ttl': 3600000,
        'x-max-length': 10000,
      },
    });

    await channel.bindQueue(
      this.queueNames.appointmentUpdated,
      this.exchangeName,
      'core.updated',
    );

    this.logger.log(
      `✅ Queue '${this.queueNames.appointmentUpdated}' bound to 'core.updated'`,
    );

    // 7. Cria fila para APPOINTMENT CANCELLED (Scheduling → Core)
    await channel.assertQueue(this.queueNames.appointmentCancelled, {
      durable: true,
      arguments: {
        'x-message-ttl': 3600000,
        'x-max-length': 10000,
      },
    });

    await channel.bindQueue(
      this.queueNames.appointmentCancelled,
      this.exchangeName,
      'core.cancelled',
    );

    this.logger.log(
      `✅ Queue '${this.queueNames.appointmentCancelled}' bound to 'core.cancelled'`,
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

      this.logger.debug(`📤 Published to '${routingKey}': ${JSON.stringify(message)}`);
    } catch (error) {
      this.logger.error(`Failed to publish to '${routingKey}'`, error.stack);
      throw error;
    }
  }

  /**
   * Publica evento: Appointment Confirmed
   */
  async publishAppointmentConfirmed(appointmentData: any): Promise<void> {
    await this.publish('core.confirmed', {
      event: 'appointment.confirmed',
      data: appointmentData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Publica evento: Appointment Failed
   */
  async publishAppointmentFailed(error: string, requestData?: any): Promise<void> {
    await this.publish('core.failed', {
      event: 'appointment.failed',
      error,
      requestData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Publica evento: Appointment Updated
   */
  async publishAppointmentUpdated(appointmentData: any): Promise<void> {
    await this.publish('core.updated', {
      event: 'appointment.updated',
      data: appointmentData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Publica evento: Appointment Cancelled
   */
  async publishAppointmentCancelled(appointmentData: any): Promise<void> {
    await this.publish('core.cancelled', {
      event: 'appointment.cancelled',
      data: appointmentData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Consome mensagens de uma fila
   */
  async consume(
    queueName: string,
    handler: (message: any) => Promise<void>,
  ): Promise<void> {
    await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
      await channel.consume(
        queueName,
        async (msg: ConsumeMessage | null) => {
          if (!msg) return;

          try {
            const content = JSON.parse(msg.content.toString());
            this.logger.debug(`📥 Received from '${queueName}': ${JSON.stringify(content)}`);

            await handler(content);

            // Acknowledge message
            channel.ack(msg);
          } catch (error) {
            this.logger.error(
              `Error processing message from '${queueName}'`,
              error.stack,
            );

            // Reject and requeue (max 3 attempts)
            const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) + 1;

            if (retryCount < 3) {
              channel.nack(msg, false, true); // Requeue
            } else {
              this.logger.error(`Max retries reached for message, discarding`);
              channel.nack(msg, false, false); // Discard
            }
          }
        },
        {
          noAck: false, // Manual acknowledgement
        },
      );

      this.logger.log(`✅ Consuming from queue '${queueName}'`);
    });
  }

  /**
   * Desconecta do RabbitMQ
   */
  private async disconnect(): Promise<void> {
    try {
      await this.channelWrapper.close();
      await this.connection.close();
      this.logger.log('✅ Disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error('Error disconnecting from RabbitMQ', error.stack);
    }
  }

  /**
   * Retorna status da conexão
   */
  isConnected(): boolean {
    return this.connection?.isConnected() ?? false;
  }
}
