import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

/**
 * Firebase Cloud Messaging Provider
 *
 * Responsável por enviar push notifications via Firebase.
 * Suporta modo MOCK para desenvolvimento/testes (quando credenciais não fornecidas).
 */
@Injectable()
export class FirebaseProvider implements OnModuleInit {
  private readonly logger = new Logger(FirebaseProvider.name);
  private app: admin.app.App | null = null;
  private isMockMode = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initialize();
  }

  /**
   * Inicializa Firebase Admin SDK
   */
  private async initialize(): Promise<void> {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>(
      'FIREBASE_CLIENT_EMAIL',
    );
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

    // Se não houver credenciais, ativa modo MOCK
    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        '🔶 Firebase credentials not found, running in MOCK mode',
      );
      this.logger.warn(
        '   Push notifications will be simulated (not actually sent)',
      );
      this.isMockMode = true;
      return;
    }

    try {
      // Inicializa Firebase Admin
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'), // Fix line breaks
        }),
      });

      this.logger.log(`✅ Firebase Admin SDK initialized (project: ${projectId})`);
    } catch (error) {
      this.logger.error('❌ Failed to initialize Firebase Admin SDK', error);
      this.logger.warn('   Falling back to MOCK mode');
      this.isMockMode = true;
    }
  }

  /**
   * Envia push notification para um device
   */
  async sendPushNotification(
    token: string,
    payload: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Modo MOCK: simula envio
    if (this.isMockMode) {
      return this.mockSendPushNotification(token, payload);
    }

    // Modo REAL: envia via Firebase
    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'prenatal_notifications',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const messageId = await this.app!.messaging().send(message);

      this.logger.debug(
        `📤 Push notification sent successfully: ${messageId}`,
      );

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      this.logger.error('❌ Failed to send push notification', error);

      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Envia push notification para múltiplos devices
   */
  async sendMulticastPushNotification(
    tokens: string[],
    payload: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ): Promise<{
    successCount: number;
    failureCount: number;
    responses: Array<{ success: boolean; messageId?: string; error?: string }>;
  }> {
    // Modo MOCK: simula envio para todos
    if (this.isMockMode) {
      const responses = tokens.map((token) =>
        this.mockSendPushNotification(token, payload),
      );
      const successCount = responses.filter((r) => r.success).length;
      const failureCount = responses.length - successCount;

      return {
        successCount,
        failureCount,
        responses,
      };
    }

    // Modo REAL: envia via Firebase multicast
    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        android: {
          priority: 'high',
        },
      };

      const response = await this.app!.messaging().sendEachForMulticast(message);

      this.logger.log(
        `📤 Multicast sent: ${response.successCount}/${tokens.length} successful`,
      );

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses.map((r, index) => ({
          success: r.success,
          messageId: r.messageId,
          error: r.error?.message,
        })),
      };
    } catch (error) {
      this.logger.error('❌ Failed to send multicast notification', error);

      return {
        successCount: 0,
        failureCount: tokens.length,
        responses: tokens.map(() => ({
          success: false,
          error: error.message || 'Unknown error',
        })),
      };
    }
  }

  /**
   * Simula envio de push notification (modo MOCK)
   */
  private mockSendPushNotification(
    token: string,
    payload: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ): { success: boolean; messageId?: string; error?: string } {
    this.logger.debug(
      `🔶 [MOCK] Push notification: "${payload.title}" to ${token.substring(0, 20)}...`,
    );

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
        error: 'Mock: Simulated delivery failure',
      };
    }
  }

  /**
   * Valida se um FCM token é válido
   */
  async validateToken(token: string): Promise<boolean> {
    if (this.isMockMode) {
      // No modo MOCK, considera válido se tiver mais de 10 caracteres
      return token && token.length > 10;
    }

    try {
      await this.app!.messaging().send({ token }, true); // dry run
      return true;
    } catch (error) {
      this.logger.warn(`Invalid FCM token: ${token.substring(0, 20)}...`);
      return false;
    }
  }

  /**
   * Retorna se está em modo MOCK
   */
  isMock(): boolean {
    return this.isMockMode;
  }
}
