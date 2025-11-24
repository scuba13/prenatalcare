import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

/**
 * Twilio SMS Provider
 *
 * Responsável por enviar SMS via Twilio.
 * Suporta modo MOCK para desenvolvimento/testes (quando credenciais não fornecidas).
 */
@Injectable()
export class TwilioProvider implements OnModuleInit {
  private readonly logger = new Logger(TwilioProvider.name);
  private client: Twilio | null = null;
  private isMockMode = false;
  private messagingServiceSid: string;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initialize();
  }

  /**
   * Inicializa Twilio Client
   */
  private async initialize(): Promise<void> {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.messagingServiceSid = this.configService.get<string>('TWILIO_MESSAGING_SERVICE_SID');

    // Se não houver credenciais, ativa modo MOCK
    if (!accountSid || !authToken || !this.messagingServiceSid) {
      this.logger.warn(
        '🔶 Twilio credentials not found, running in MOCK mode',
      );
      this.logger.warn('   SMS will be simulated (not actually sent)');
      this.isMockMode = true;
      return;
    }

    try {
      // Inicializa Twilio Client
      this.client = new Twilio(accountSid, authToken);

      this.logger.log(
        `✅ Twilio initialized (messagingServiceSid: ${this.messagingServiceSid})`,
      );
    } catch (error) {
      this.logger.error('❌ Failed to initialize Twilio', error);
      this.logger.warn('   Falling back to MOCK mode');
      this.isMockMode = true;
    }
  }

  /**
   * Envia SMS
   */
  async sendSMS(payload: {
    to: string;
    message: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Modo MOCK: simula envio
    if (this.isMockMode) {
      return this.mockSendSMS(payload);
    }

    // Modo REAL: envia via Twilio
    try {
      const response = await this.client!.messages.create({
        messagingServiceSid: this.messagingServiceSid,
        to: payload.to,
        body: payload.message,
      });

      this.logger.debug(
        `📱 SMS sent successfully to ${payload.to} (SID: ${response.sid})`,
      );

      return {
        success: true,
        messageId: response.sid,
      };
    } catch (error) {
      this.logger.error(
        `❌ Failed to send SMS to ${payload.to}`,
        error.message,
      );

      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Envia SMS em lote (múltiplos destinatários)
   */
  async sendBulkSMS(payload: {
    recipients: string[];
    message: string;
  }): Promise<{
    successCount: number;
    failureCount: number;
    results: Array<{ to: string; success: boolean; messageId?: string; error?: string }>;
  }> {
    const results: Array<{ to: string; success: boolean; messageId?: string; error?: string }> = [];

    for (const recipient of payload.recipients) {
      const result = await this.sendSMS({
        to: recipient,
        message: payload.message,
      });

      results.push({
        to: recipient,
        ...result,
      });
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    return {
      successCount,
      failureCount,
      results,
    };
  }

  /**
   * Verifica se um número de telefone é válido
   */
  async validatePhoneNumber(phone: string): Promise<boolean> {
    if (this.isMockMode) {
      // No modo MOCK, valida formato básico (+55...)
      return /^\+[1-9]\d{1,14}$/.test(phone);
    }

    try {
      const lookup = await this.client!.lookups.v2
        .phoneNumbers(phone)
        .fetch();

      return lookup.valid || false;
    } catch (error) {
      this.logger.warn(`Invalid phone number: ${phone}`);
      return false;
    }
  }

  /**
   * Simula envio de SMS (modo MOCK)
   */
  private mockSendSMS(payload: {
    to: string;
    message: string;
  }): { success: boolean; messageId?: string; error?: string } {
    this.logger.debug(
      `🔶 [MOCK] SMS to ${payload.to}`,
    );
    this.logger.debug(`   Message: ${payload.message}`);

    // Simula 90% de sucesso (SMS tem mais falhas que email)
    const success = Math.random() > 0.1;

    if (success) {
      return {
        success: true,
        messageId: `SM${Date.now()}${Math.random().toString(36).substr(2, 32).toUpperCase()}`,
      };
    } else {
      return {
        success: false,
        error: 'Mock: SMS delivery failed',
      };
    }
  }

  /**
   * Retorna se está em modo MOCK
   */
  isMock(): boolean {
    return this.isMockMode;
  }

  /**
   * Obtém status de uma mensagem
   */
  async getMessageStatus(messageSid: string): Promise<string | null> {
    if (this.isMockMode) {
      return 'delivered'; // Mock sempre retorna delivered
    }

    try {
      const message = await this.client!.messages(messageSid).fetch();
      return message.status;
    } catch (error) {
      this.logger.error(
        `Failed to get message status for ${messageSid}`,
        error.message,
      );
      return null;
    }
  }
}
