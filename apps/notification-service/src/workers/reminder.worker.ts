import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { NotificationsService } from '../services/notifications.service';
import {
  NotificationChannel,
  NotificationType,
} from '../entities/notification.entity';

/**
 * Worker de Lembretes Automáticos
 * Busca appointments e tasks do Core/Scheduling Service e envia lembretes
 */
@Injectable()
export class ReminderWorker {
  private readonly logger = new Logger(ReminderWorker.name);
  private coreServiceUrl: string;
  private schedulingServiceUrl: string;
  private isRunning = false;

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.coreServiceUrl = this.configService.get<string>(
      'CORE_SERVICE_URL',
      'http://localhost:3001',
    );
    this.schedulingServiceUrl = this.configService.get<string>(
      'SCHEDULING_SERVICE_URL',
      'http://localhost:3003',
    );
  }

  /**
   * Cron job que executa a cada hora
   * Envia lembretes de appointments para o dia seguinte
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleAppointmentReminders() {
    if (this.isRunning) {
      this.logger.warn(
        'Reminder job já está em execução, pulando esta execução',
      );
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      this.logger.log('🔔 Iniciando envio de lembretes de consultas');

      // Buscar appointments de amanhã
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const appointments = await this.fetchTomorrowAppointments(tomorrow);

      if (appointments.length === 0) {
        this.logger.log('Nenhuma consulta para amanhã');
        return;
      }

      this.logger.log(`Encontradas ${appointments.length} consultas para amanhã`);

      let successCount = 0;
      let errorCount = 0;

      for (const appointment of appointments) {
        try {
          const citizenId = appointment.citizenId || appointment.patientId;

          if (!citizenId) {
            this.logger.warn(
              `Appointment ${appointment.id} sem citizenId, pulando`,
            );
            errorCount++;
            continue;
          }

          // Formatar data/hora da consulta
          const appointmentDate = new Date(
            appointment.scheduledAt || appointment.date,
          );
          const timeStr = appointmentDate.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          });

          await this.notificationsService.sendNotification({
            citizenId,
            type: NotificationType.APPOINTMENT_REMINDER,
            channel: NotificationChannel.PUSH,
            title: 'Lembrete de Consulta',
            body: `Você tem consulta amanhã às ${timeStr}`,
            data: {
              appointmentId: appointment.id,
              scheduledAt: appointment.scheduledAt || appointment.date,
            },
            externalId: appointment.id,
            externalType: 'appointment',
          });

          successCount++;
          this.logger.debug(`✅ Lembrete enviado para ${citizenId}`);
        } catch (error) {
          errorCount++;
          this.logger.error(
            `❌ Erro ao enviar lembrete para appointment ${appointment.id}: ${error.message}`,
          );
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ Lembretes de consultas concluídos em ${duration}ms: ${successCount} sucessos, ${errorCount} erros`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erro crítico ao enviar lembretes de consultas: ${error.message}`,
        error.stack,
      );
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Cron job que executa a cada 6 horas
   * Envia lembretes de tarefas pendentes
   */
  @Cron('0 */6 * * *') // A cada 6 horas
  async handleTaskReminders() {
    try {
      this.logger.log('🔔 Iniciando envio de lembretes de tarefas');

      // Buscar tarefas pendentes com vencimento próximo
      const tasks = await this.fetchUpcomingTasks();

      if (tasks.length === 0) {
        this.logger.log('Nenhuma tarefa pendente com vencimento próximo');
        return;
      }

      this.logger.log(`Encontradas ${tasks.length} tarefas pendentes`);

      let successCount = 0;

      for (const task of tasks) {
        try {
          const citizenId = task.citizenId || task.pregnancyId;

          if (!citizenId) {
            this.logger.warn(`Task ${task.id} sem citizenId, pulando`);
            continue;
          }

          await this.notificationsService.sendNotification({
            citizenId,
            type: NotificationType.TASK_REMINDER,
            channel: NotificationChannel.PUSH,
            title: 'Lembrete de Tarefa',
            body: task.title || task.description || 'Você tem uma tarefa pendente',
            data: {
              taskId: task.id,
              dueDate: task.dueDate,
            },
            externalId: task.id,
            externalType: 'task',
          });

          successCount++;
        } catch (error) {
          this.logger.error(
            `Erro ao enviar lembrete para task ${task.id}: ${error.message}`,
          );
        }
      }

      this.logger.log(`✅ Lembretes de tarefas enviados: ${successCount}`);
    } catch (error) {
      this.logger.error(
        `Erro ao enviar lembretes de tarefas: ${error.message}`,
      );
    }
  }

  /**
   * Busca appointments de amanhã do Scheduling Service
   */
  private async fetchTomorrowAppointments(tomorrow: Date): Promise<any[]> {
    try {
      const dateStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

      const response = await firstValueFrom(
        this.httpService.get(`${this.schedulingServiceUrl}/api/v1/scheduling/appointments`, {
          params: {
            date: dateStr,
            status: 'confirmed',
          },
        }),
      );

      return response.data?.data || response.data || [];
    } catch (error) {
      const status = error.response?.status;

      // Serviço indisponível ou sem dados não é erro crítico
      if (
        status === 404 ||
        status === 500 ||
        error.code === 'ECONNREFUSED'
      ) {
        this.logger.log(
          `ℹ️  Scheduling Service indisponível ou sem appointments para amanhã`,
        );
        return [];
      }

      this.logger.warn(
        `⚠️  Erro ao buscar appointments: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Busca tarefas pendentes do Core Service
   */
  private async fetchUpcomingTasks(): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.coreServiceUrl}/api/v1/internal/tasks/due-soon`, {
          params: {
            days: 7, // Próximos 7 dias
          },
        }),
      );

      return response.data?.data || response.data || [];
    } catch (error) {
      const status = error.response?.status;

      if (
        status === 404 ||
        status === 500 ||
        error.code === 'ECONNREFUSED'
      ) {
        this.logger.log(
          `ℹ️  Core Service indisponível ou sem tarefas pendentes`,
        );
        return [];
      }

      this.logger.warn(
        `⚠️  Erro ao buscar tarefas: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Força execução manual de lembretes (útil para testes)
   */
  async triggerManualReminders(): Promise<void> {
    this.logger.log('Lembretes manuais disparados');
    await this.handleAppointmentReminders();
  }
}
