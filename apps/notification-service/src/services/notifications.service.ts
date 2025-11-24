import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from '../entities/notification.entity';
import { UserPreference } from '../entities/user-preference.entity';
import { FirebaseProvider } from '../providers/firebase.provider';
import { SendGridProvider } from '../providers/sendgrid.provider';
import { TwilioProvider } from '../providers/twilio.provider';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { SendNotificationDto } from '../dto/send-notification.dto';

/**
 * Service responsável pela lógica de negócio de notificações
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(UserPreference)
    private readonly preferenceRepository: Repository<UserPreference>,
    private readonly firebaseProvider: FirebaseProvider,
    private readonly sendGridProvider: SendGridProvider,
    private readonly twilioProvider: TwilioProvider,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  /**
   * Envia uma notificação para um usuário
   */
  async sendNotification(dto: SendNotificationDto): Promise<Notification> {
    this.logger.log(
      `Enviando notificação para cidadão ${dto.citizenId} via ${dto.channel}`,
    );

    // 1. Buscar preferências do usuário
    const preferences = await this.getOrCreatePreferences(dto.citizenId);

    // 2. Verificar se o canal está habilitado
    if (!this.isChannelEnabled(preferences, dto.channel)) {
      this.logger.warn(
        `Canal ${dto.channel} desabilitado para cidadão ${dto.citizenId}`,
      );
      throw new Error(`Canal ${dto.channel} desabilitado para este usuário`);
    }

    // 3. Verificar quiet hours
    if (preferences.isQuietHours()) {
      this.logger.debug(
        `Cidadão ${dto.citizenId} está em quiet hours, agendando para depois`,
      );
      // TODO: Implementar agendamento para depois do quiet hours
      // Por enquanto, vamos enviar mesmo assim para simplificar
    }

    // 4. Criar registro da notificação
    const notification = this.notificationRepository.create({
      citizenId: dto.citizenId,
      type: dto.type,
      channel: dto.channel,
      title: dto.title,
      body: dto.body,
      data: dto.data,
      externalId: dto.externalId,
      externalType: dto.externalType,
      status: NotificationStatus.PENDING,
    });

    await this.notificationRepository.save(notification);

    // 5. Enviar via canal apropriado
    try {
      let success = false;
      let errorMessage: string | undefined;

      switch (dto.channel) {
        case NotificationChannel.PUSH:
          const pushResult = await this.sendPush(preferences, notification);
          success = pushResult.success;
          errorMessage = pushResult.error;
          break;

        case NotificationChannel.EMAIL:
          const emailResult = await this.sendEmail(preferences, notification);
          success = emailResult.success;
          errorMessage = emailResult.error;
          break;

        case NotificationChannel.SMS:
          const smsResult = await this.sendSMS(preferences, notification);
          success = smsResult.success;
          errorMessage = smsResult.error;
          break;
      }

      // 6. Atualizar status da notificação
      if (success) {
        notification.status = NotificationStatus.SENT;
        notification.sentAt = new Date();
        await this.notificationRepository.save(notification);

        // Publicar evento de sucesso
        await this.rabbitMQService.publishNotificationSent({
          id: notification.id,
          citizenId: notification.citizenId,
          type: notification.type,
          channel: notification.channel,
        });

        this.logger.log(`✅ Notificação ${notification.id} enviada com sucesso`);
      } else {
        notification.status = NotificationStatus.FAILED;
        notification.errorMessage = errorMessage;
        notification.retryCount++;
        await this.notificationRepository.save(notification);

        // Publicar evento de falha
        await this.rabbitMQService.publishNotificationFailed(
          errorMessage || 'Unknown error',
          {
            id: notification.id,
            citizenId: notification.citizenId,
          },
        );

        this.logger.error(
          `❌ Falha ao enviar notificação ${notification.id}: ${errorMessage}`,
        );
      }

      return notification;
    } catch (error) {
      this.logger.error(
        `Erro inesperado ao enviar notificação ${notification.id}`,
        error.stack,
      );

      notification.status = NotificationStatus.FAILED;
      notification.errorMessage = error.message;
      notification.retryCount++;
      await this.notificationRepository.save(notification);

      throw error;
    }
  }

  /**
   * Envia push notification via Firebase
   */
  private async sendPush(
    preferences: UserPreference,
    notification: Notification,
  ): Promise<{ success: boolean; error?: string }> {
    if (!preferences.fcmToken) {
      return {
        success: false,
        error: 'FCM token not found',
      };
    }

    const result = await this.firebaseProvider.sendPushNotification(
      preferences.fcmToken,
      {
        title: notification.title,
        body: notification.body,
        data: notification.data
          ? Object.fromEntries(
              Object.entries(notification.data).map(([k, v]) => [
                k,
                String(v),
              ]),
            )
          : {},
      },
    );

    return result;
  }

  /**
   * Envia email via SendGrid
   */
  private async sendEmail(
    preferences: UserPreference,
    notification: Notification,
  ): Promise<{ success: boolean; error?: string }> {
    if (!preferences.email) {
      return {
        success: false,
        error: 'Email not found',
      };
    }

    const result = await this.sendGridProvider.sendEmail({
      to: preferences.email,
      subject: notification.title,
      text: notification.body,
    });

    return result;
  }

  /**
   * Envia SMS via Twilio
   */
  private async sendSMS(
    preferences: UserPreference,
    notification: Notification,
  ): Promise<{ success: boolean; error?: string }> {
    if (!preferences.phone) {
      return {
        success: false,
        error: 'Phone not found',
      };
    }

    const result = await this.twilioProvider.sendSMS({
      to: preferences.phone,
      message: notification.body,
    });

    return result;
  }

  /**
   * Verifica se um canal está habilitado para o usuário
   */
  private isChannelEnabled(
    preferences: UserPreference,
    channel: NotificationChannel,
  ): boolean {
    switch (channel) {
      case NotificationChannel.PUSH:
        return preferences.pushEnabled && !!preferences.fcmToken;
      case NotificationChannel.EMAIL:
        return preferences.emailEnabled && !!preferences.email;
      case NotificationChannel.SMS:
        return preferences.smsEnabled && !!preferences.phone;
      default:
        return false;
    }
  }

  /**
   * Busca ou cria preferências do usuário
   */
  async getOrCreatePreferences(citizenId: string): Promise<UserPreference> {
    let preferences = await this.preferenceRepository.findOne({
      where: { citizenId },
    });

    if (!preferences) {
      this.logger.log(
        `Criando preferências padrão para cidadão ${citizenId}`,
      );
      preferences = this.preferenceRepository.create({
        citizenId,
        pushEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
      });
      await this.preferenceRepository.save(preferences);
    }

    return preferences;
  }

  /**
   * Atualiza preferências do usuário
   */
  async updatePreferences(
    citizenId: string,
    updates: Partial<UserPreference>,
  ): Promise<UserPreference> {
    const preferences = await this.getOrCreatePreferences(citizenId);

    // Se estiver atualizando FCM token, registrar timestamp
    if (updates.fcmToken && updates.fcmToken !== preferences.fcmToken) {
      updates.fcmTokenUpdatedAt = new Date();
    }

    Object.assign(preferences, updates);
    return await this.preferenceRepository.save(preferences);
  }

  /**
   * Busca histórico de notificações de um cidadão
   */
  async getNotificationHistory(
    citizenId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Notification[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.notificationRepository.findAndCount({
      where: { citizenId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Busca notificação por ID
   */
  async findById(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    return notification;
  }

  /**
   * Busca notificações pendentes (para retry)
   */
  async findPendingNotifications(): Promise<Notification[]> {
    return await this.notificationRepository.find({
      where: { status: NotificationStatus.PENDING },
      take: 100,
    });
  }

  /**
   * Busca notificações falhadas (para retry)
   */
  async findFailedNotifications(maxRetries: number = 3): Promise<Notification[]> {
    return await this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.status = :status', {
        status: NotificationStatus.FAILED,
      })
      .andWhere('notification.retry_count < :maxRetries', { maxRetries })
      .orderBy('notification.created_at', 'ASC')
      .take(50)
      .getMany();
  }
}
