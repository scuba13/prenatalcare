import { Injectable, Logger } from '@nestjs/common';
import { PublishService } from '../publish/publish.service';

/**
 * Worker de Publicação para RabbitMQ
 * Consome mensagens da fila e processa publicações na RNDS
 *
 * Nota: Este worker será ativado quando RabbitMQ for configurado (Task 3.10)
 * Por enquanto, define a estrutura para consumo futuro
 */
@Injectable()
export class PublishWorker {
  private readonly logger = new Logger(PublishWorker.name);

  constructor(private readonly publishService: PublishService) {}

  /**
   * Processa mensagem de publicação de cidadã
   * Será chamado pelo consumer RabbitMQ quando configurado
   */
  async handlePublishCitizen(message: PublishCitizenMessage): Promise<void> {
    this.logger.log(
      `Processando publicação de cidadã: CPF ${message.citizenData.cpf}`,
    );

    try {
      const result = await this.publishService.publishCitizen(
        message.citizenData,
      );

      this.logger.log(
        `✅ Cidadã publicada com sucesso: ${result.patientId || 'N/A'}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erro ao publicar cidadã ${message.citizenData.cpf}: ${error.message}`,
      );
      throw error; // Re-throw para que RabbitMQ possa fazer retry/dead-letter
    }
  }

  /**
   * Processa mensagem de publicação de gravidez
   * Será chamado pelo consumer RabbitMQ quando configurado
   */
  async handlePublishPregnancy(
    message: PublishPregnancyMessage,
  ): Promise<void> {
    this.logger.log(
      `Processando publicação de gravidez: Pregnancy ID ${message.pregnancyData.id}`,
    );

    try {
      const result = await this.publishService.publishPregnancy(
        message.pregnancyData,
      );

      this.logger.log(`✅ Gravidez publicada com sucesso`);
    } catch (error) {
      this.logger.error(
        `❌ Erro ao publicar gravidez ${message.pregnancyData.id}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Callback para mensagens com erro (Dead Letter Queue)
   * Loga erros que não puderam ser processados após retries
   */
  async handleDeadLetter(message: any, error: Error): Promise<void> {
    this.logger.error(
      `📮 Mensagem enviada para Dead Letter Queue após múltiplas tentativas`,
    );
    this.logger.error(`Mensagem: ${JSON.stringify(message)}`);
    this.logger.error(`Erro: ${error.message}`);

    // Aqui você pode implementar lógica adicional:
    // - Salvar no banco de dados para análise posterior
    // - Enviar notificação para equipe
    // - Criar ticket de suporte automático
  }
}

/**
 * Tipos de mensagens para RabbitMQ
 */
export interface PublishCitizenMessage {
  citizenData: {
    cpf: string;
    cns?: string;
    name: string;
    birthDate: string;
    gender: 'female' | 'male' | 'other' | 'unknown';
    motherName?: string;
    telecom?: Array<{
      system: 'phone' | 'email';
      value: string;
    }>;
    address?: {
      line: string[];
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
}

export interface PublishPregnancyMessage {
  pregnancyData: {
    id?: string;
    onsetDate: string;
    estimatedDueDate?: string;
    riskLevel?: 'low' | 'medium' | 'high';
    clinicalStatus?: 'active' | 'resolved' | 'inactive';
    carePlan?: {
      title: string;
      description?: string;
      activities?: Array<{
        code: string;
        display: string;
        scheduledDate?: string;
      }>;
    };
  };
}
