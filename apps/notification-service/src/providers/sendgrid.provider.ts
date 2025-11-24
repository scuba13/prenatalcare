import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

/**
 * SendGrid Email Provider
 *
 * Responsável por enviar emails via SendGrid.
 * Suporta modo MOCK para desenvolvimento/testes (quando API key não fornecida).
 */
@Injectable()
export class SendGridProvider implements OnModuleInit {
  private readonly logger = new Logger(SendGridProvider.name);
  private isMockMode = false;
  private fromEmail: string;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initialize();
  }

  /**
   * Inicializa SendGrid API
   */
  private async initialize(): Promise<void> {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    this.fromEmail = this.configService.get<string>(
      'SENDGRID_FROM_EMAIL',
      'noreply@prenatalcare.com',
    );

    // Se não houver API key, ativa modo MOCK
    if (!apiKey) {
      this.logger.warn(
        '🔶 SendGrid API key not found, running in MOCK mode',
      );
      this.logger.warn('   Emails will be simulated (not actually sent)');
      this.isMockMode = true;
      return;
    }

    try {
      // Configura SendGrid API
      sgMail.setApiKey(apiKey);

      this.logger.log(
        `✅ SendGrid initialized (from: ${this.fromEmail})`,
      );
    } catch (error) {
      this.logger.error('❌ Failed to initialize SendGrid', error);
      this.logger.warn('   Falling back to MOCK mode');
      this.isMockMode = true;
    }
  }

  /**
   * Envia email
   */
  async sendEmail(payload: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Modo MOCK: simula envio
    if (this.isMockMode) {
      return this.mockSendEmail(payload);
    }

    // Modo REAL: envia via SendGrid
    try {
      const msg = {
        to: payload.to,
        from: this.fromEmail,
        subject: payload.subject,
        text: payload.text,
        html: payload.html || this.generateHtml(payload.text),
      };

      const response = await sgMail.send(msg);

      this.logger.debug(
        `📧 Email sent successfully to ${payload.to}`,
      );

      return {
        success: true,
        messageId: response[0]?.headers?.['x-message-id'] || 'unknown',
      };
    } catch (error) {
      this.logger.error(
        `❌ Failed to send email to ${payload.to}`,
        error.response?.body?.errors || error.message,
      );

      return {
        success: false,
        error: error.response?.body?.errors?.[0]?.message || error.message || 'Unknown error',
      };
    }
  }

  /**
   * Envia email com template
   */
  async sendTemplateEmail(payload: {
    to: string;
    templateId: string;
    dynamicData: Record<string, any>;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Modo MOCK
    if (this.isMockMode) {
      this.logger.debug(
        `🔶 [MOCK] Template email: template=${payload.templateId} to ${payload.to}`,
      );
      const success = Math.random() > 0.05;
      return {
        success,
        messageId: success ? `mock-${Date.now()}` : undefined,
        error: success ? undefined : 'Mock: Template email delivery failed',
      };
    }

    // Modo REAL
    try {
      const msg = {
        to: payload.to,
        from: this.fromEmail,
        templateId: payload.templateId,
        dynamicTemplateData: payload.dynamicData,
      };

      const response = await sgMail.send(msg);

      this.logger.debug(
        `📧 Template email sent successfully to ${payload.to}`,
      );

      return {
        success: true,
        messageId: response[0]?.headers?.['x-message-id'] || 'unknown',
      };
    } catch (error) {
      this.logger.error(
        `❌ Failed to send template email to ${payload.to}`,
        error.response?.body?.errors || error.message,
      );

      return {
        success: false,
        error: error.response?.body?.errors?.[0]?.message || error.message || 'Unknown error',
      };
    }
  }

  /**
   * Simula envio de email (modo MOCK)
   */
  private mockSendEmail(payload: {
    to: string;
    subject: string;
    text: string;
  }): { success: boolean; messageId?: string; error?: string } {
    this.logger.debug(
      `🔶 [MOCK] Email: "${payload.subject}" to ${payload.to}`,
    );
    this.logger.debug(`   Content: ${payload.text.substring(0, 100)}...`);

    // Simula 95% de sucesso
    const success = Math.random() > 0.05;

    if (success) {
      return {
        success: true,
        messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
    } else {
      return {
        success: false,
        error: 'Mock: Email delivery failed',
      };
    }
  }

  /**
   * Gera HTML simples a partir de texto
   */
  private generateHtml(text: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <p>${text.replace(/\n/g, '<br>')}</p>
            <div class="footer">
              <p>Sistema de Pré-Natal</p>
              <p>Esta é uma mensagem automática, por favor não responda.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Retorna se está em modo MOCK
   */
  isMock(): boolean {
    return this.isMockMode;
  }
}
