import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, ChannelModel, Channel, Options } from 'amqplib';

/**
 * Serviço RabbitMQ para mensageria assíncrona
 * Implementa publisher/consumer pattern com exchanges e filas
 */
@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private readonly rabbitUrl: string;
  private readonly exchangeName = 'rnds';
  private readonly exchangeType = 'topic';

  // Definição de filas
  private readonly queues = {
    syncPatient: 'rnds.sync.patient',
    publishBundle: 'rnds.publish.bundle',
  };

  constructor(private readonly configService: ConfigService) {
    this.rabbitUrl = this.configService.get<string>(
      'RABBITMQ_URL',
      'amqp://localhost:5672',
    );
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Conecta ao RabbitMQ e configura exchange/filas
   */
  private async connect(): Promise<void> {
    try {
      this.logger.log(`Conectando ao RabbitMQ em ${this.rabbitUrl}...`);

      // Criar conexão
      this.connection = await connect(this.rabbitUrl);

      // Event handlers para monitorar conexão
      this.connection.on('error', (err) => {
        this.logger.error(`Erro na conexão RabbitMQ: ${err.message}`);
      });

      this.connection.on('close', () => {
        this.logger.warn('Conexão RabbitMQ fechada');
      });

      // Criar canal
      this.channel = await this.connection.createChannel();

      // Configurar exchange
      await this.channel.assertExchange(this.exchangeName, this.exchangeType, {
        durable: true,
      });

      this.logger.log(`Exchange '${this.exchangeName}' (tipo: ${this.exchangeType}) criado`);

      // Configurar filas
      await this.setupQueues();

      this.logger.log('✅ RabbitMQ configurado com sucesso');
    } catch (error) {
      this.logger.error(`❌ Falha ao conectar ao RabbitMQ: ${error.message}`);

      // Em desenvolvimento, não bloquear a aplicação se RabbitMQ não estiver disponível
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.warn('⚠️  RabbitMQ indisponível em desenvolvimento - continuando sem mensageria');
      } else {
        throw error;
      }
    }
  }

  /**
   * Configura as filas e bindings
   */
  private async setupQueues(): Promise<void> {
    if (!this.channel) {
      throw new Error('Canal RabbitMQ não inicializado');
    }

    // Fila: rnds.sync.patient
    await this.channel.assertQueue(this.queues.syncPatient, {
      durable: true,
      arguments: {
        'x-message-ttl': 86400000, // 24 horas
        'x-max-length': 10000,
      },
    });

    await this.channel.bindQueue(
      this.queues.syncPatient,
      this.exchangeName,
      'sync.patient.*',
    );

    this.logger.log(`Fila '${this.queues.syncPatient}' criada e vinculada`);

    // Fila: rnds.publish.bundle
    await this.channel.assertQueue(this.queues.publishBundle, {
      durable: true,
      arguments: {
        'x-message-ttl': 86400000, // 24 horas
        'x-max-length': 10000,
      },
    });

    await this.channel.bindQueue(
      this.queues.publishBundle,
      this.exchangeName,
      'publish.*',
    );

    this.logger.log(`Fila '${this.queues.publishBundle}' criada e vinculada`);
  }

  /**
   * Publica uma mensagem no exchange
   *
   * @param routingKey Routing key para roteamento (ex: 'sync.patient.123', 'publish.bundle')
   * @param message Payload da mensagem (será convertido para JSON)
   * @param options Opções adicionais (persistent, expiration, etc.)
   */
  async publish(
    routingKey: string,
    message: any,
    options?: Options.Publish,
  ): Promise<boolean> {
    if (!this.channel) {
      this.logger.warn('Canal RabbitMQ não disponível, mensagem não enviada');
      return false;
    }

    try {
      const content = Buffer.from(JSON.stringify(message));

      const published = this.channel.publish(
        this.exchangeName,
        routingKey,
        content,
        {
          persistent: true,
          contentType: 'application/json',
          timestamp: Date.now(),
          ...options,
        },
      );

      if (published) {
        this.logger.debug(`Mensagem publicada: ${routingKey}`);
      } else {
        this.logger.warn(`Buffer cheio, mensagem não enviada: ${routingKey}`);
      }

      return published;
    } catch (error) {
      this.logger.error(`Erro ao publicar mensagem: ${error.message}`);
      return false;
    }
  }

  /**
   * Consome mensagens de uma fila
   *
   * @param queueName Nome da fila
   * @param onMessage Callback para processar mensagem
   */
  async consume(
    queueName: string,
    onMessage: (message: any) => Promise<void>,
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('Canal RabbitMQ não disponível');
    }

    await this.channel.consume(
      queueName,
      async (msg) => {
        if (!msg) {
          return;
        }

        try {
          const content = JSON.parse(msg.content.toString());

          this.logger.debug(`Mensagem recebida de ${queueName}`);

          // Processar mensagem
          await onMessage(content);

          // ACK se processamento bem-sucedido
          this.channel?.ack(msg);
        } catch (error) {
          this.logger.error(
            `Erro ao processar mensagem de ${queueName}: ${error.message}`,
          );

          // NACK e requeue se erro (com limite de tentativas via dead-letter)
          this.channel?.nack(msg, false, false);
        }
      },
      {
        noAck: false, // Requer ACK manual
      },
    );

    this.logger.log(`Consumindo mensagens de: ${queueName}`);
  }

  /**
   * Desconecta do RabbitMQ
   */
  private async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      this.logger.log('RabbitMQ desconectado');
    } catch (error) {
      this.logger.error(`Erro ao desconectar RabbitMQ: ${error.message}`);
    }
  }

  /**
   * Retorna os nomes das filas configuradas
   */
  getQueues() {
    return this.queues;
  }

  /**
   * Verifica se RabbitMQ está conectado
   */
  isConnected(): boolean {
    return this.channel !== null && this.connection !== null;
  }
}
