import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import { NotificationsService } from '../services/notifications.service';
import {
  NotificationChannel,
  NotificationType,
} from '../entities/notification.entity';

/**
 * Event Listener responsável por consumir eventos do RabbitMQ
 * e criar notificações automaticamente
 */
@Injectable()
export class EventListener implements OnModuleInit {
  private readonly logger = new Logger(EventListener.name);

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit() {
    await this.setupConsumers();
  }

  /**
   * Configura consumers para todas as filas
   */
  private async setupConsumers(): Promise<void> {
    const queues = this.rabbitMQService.getQueueNames();

    // Consumer para eventos de appointments
    await this.rabbitMQService.consume(
      queues.appointmentEvents,
      this.handleAppointmentEvent.bind(this),
    );

    // Consumer para eventos de tasks
    await this.rabbitMQService.consume(
      queues.taskEvents,
      this.handleTaskEvent.bind(this),
    );

    // Consumer para eventos de pregnancy
    await this.rabbitMQService.consume(
      queues.pregnancyEvents,
      this.handlePregnancyEvent.bind(this),
    );

    this.logger.log('✅ Event listeners configurados');
  }

  /**
   * Handler para eventos de appointments
   */
  private async handleAppointmentEvent(message: any): Promise<void> {
    this.logger.debug(`Processando evento de appointment: ${message.event}`);

    const { event, data } = message;

    // Extrair dados do appointment
    const citizenId = data.citizenId || data.patientId;
    const appointmentId = data.id || data.appointmentId;

    if (!citizenId) {
      this.logger.warn('Evento de appointment sem citizenId, ignorando');
      return;
    }

    let title: string;
    let body: string;
    let type: NotificationType;

    switch (event) {
      case 'appointment.created':
      case 'scheduling.appointment.created':
        title = 'Consulta Agendada';
        body = `Sua consulta foi agendada para ${this.formatDate(data.scheduledAt || data.date)}`;
        type = NotificationType.APPOINTMENT_CREATED;
        break;

      case 'appointment.cancelled':
      case 'scheduling.appointment.cancelled':
        title = 'Consulta Cancelada';
        body = 'Sua consulta foi cancelada';
        type = NotificationType.APPOINTMENT_CANCELLED;
        break;

      case 'appointment.rescheduled':
      case 'scheduling.appointment.rescheduled':
        title = 'Consulta Reagendada';
        body = `Sua consulta foi reagendada para ${this.formatDate(data.scheduledAt || data.newDate)}`;
        type = NotificationType.APPOINTMENT_RESCHEDULED;
        break;

      case 'appointment.confirmed':
      case 'scheduling.appointment.confirmed':
        title = 'Consulta Confirmada';
        body = `Sua consulta foi confirmada para ${this.formatDate(data.scheduledAt || data.date)}`;
        type = NotificationType.APPOINTMENT_CREATED;
        break;

      default:
        this.logger.warn(`Evento de appointment desconhecido: ${event}`);
        return;
    }

    // Enviar notificação push
    try {
      await this.notificationsService.sendNotification({
        citizenId,
        type,
        channel: NotificationChannel.PUSH,
        title,
        body,
        data: {
          appointmentId,
          scheduledAt: data.scheduledAt || data.date,
        },
        externalId: appointmentId,
        externalType: 'appointment',
      });

      this.logger.log(`✅ Notificação de appointment enviada para ${citizenId}`);
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificação de appointment: ${error.message}`,
      );
      // Não lançar erro para não reprocessar a mensagem
    }
  }

  /**
   * Handler para eventos de tasks
   */
  private async handleTaskEvent(message: any): Promise<void> {
    this.logger.debug(`Processando evento de task: ${message.event}`);

    const { event, data } = message;

    const citizenId = data.citizenId;
    const taskId = data.id || data.taskId;

    if (!citizenId) {
      this.logger.warn('Evento de task sem citizenId, ignorando');
      return;
    }

    let title: string;
    let body: string;
    let type: NotificationType;

    switch (event) {
      case 'task.created':
      case 'core.task.created':
        title = 'Nova Tarefa';
        body = `Você tem uma nova tarefa: ${data.title || data.description}`;
        type = NotificationType.TASK_REMINDER;
        break;

      case 'task.overdue':
      case 'core.task.overdue':
        title = 'Tarefa Atrasada';
        body = `Sua tarefa está atrasada: ${data.title || data.description}`;
        type = NotificationType.TASK_OVERDUE;
        break;

      case 'task.due_soon':
      case 'core.task.due_soon':
        title = 'Lembrete de Tarefa';
        body = `Lembrete: ${data.title || data.description} vence em breve`;
        type = NotificationType.TASK_REMINDER;
        break;

      default:
        this.logger.warn(`Evento de task desconhecido: ${event}`);
        return;
    }

    // Enviar notificação push
    try {
      await this.notificationsService.sendNotification({
        citizenId,
        type,
        channel: NotificationChannel.PUSH,
        title,
        body,
        data: {
          taskId,
          dueDate: data.dueDate,
        },
        externalId: taskId,
        externalType: 'task',
      });

      this.logger.log(`✅ Notificação de task enviada para ${citizenId}`);
    } catch (error) {
      this.logger.error(`Erro ao enviar notificação de task: ${error.message}`);
    }
  }

  /**
   * Handler para eventos de pregnancy
   */
  private async handlePregnancyEvent(message: any): Promise<void> {
    this.logger.debug(`Processando evento de pregnancy: ${message.event}`);

    const { event, data } = message;

    const citizenId = data.citizenId;

    if (!citizenId) {
      this.logger.warn('Evento de pregnancy sem citizenId, ignorando');
      return;
    }

    let title: string;
    let body: string;

    switch (event) {
      case 'pregnancy.milestone':
      case 'core.pregnancy.milestone':
        title = 'Marco da Gravidez';
        body = `Parabéns! Você alcançou ${data.weeks} semanas de gestação`;
        break;

      case 'pregnancy.high_risk':
      case 'core.pregnancy.high_risk':
        title = 'Atenção - Gestação de Alto Risco';
        body =
          'Sua gestação foi classificada como alto risco. Entre em contato com seu médico.';
        break;

      default:
        this.logger.warn(`Evento de pregnancy desconhecido: ${event}`);
        return;
    }

    // Enviar notificação push
    try {
      await this.notificationsService.sendNotification({
        citizenId,
        type: NotificationType.PREGNANCY_MILESTONE,
        channel: NotificationChannel.PUSH,
        title,
        body,
        data: {
          pregnancyId: data.pregnancyId || data.id,
          weeks: data.weeks,
        },
        externalId: data.pregnancyId || data.id,
        externalType: 'pregnancy',
      });

      this.logger.log(`✅ Notificação de pregnancy enviada para ${citizenId}`);
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificação de pregnancy: ${error.message}`,
      );
    }
  }

  /**
   * Formata data para exibição
   */
  private formatDate(dateString: string): string {
    if (!dateString) return 'data não especificada';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return dateString;
    }
  }
}
