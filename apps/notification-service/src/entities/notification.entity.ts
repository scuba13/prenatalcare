import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Canais de notificação disponíveis
 */
export enum NotificationChannel {
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms',
}

/**
 * Status de envio da notificação
 */
export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  DELIVERED = 'delivered',
}

/**
 * Tipos de notificação
 */
export enum NotificationType {
  APPOINTMENT_REMINDER = 'appointment_reminder',
  APPOINTMENT_CREATED = 'appointment_created',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  APPOINTMENT_RESCHEDULED = 'appointment_rescheduled',
  TASK_REMINDER = 'task_reminder',
  TASK_OVERDUE = 'task_overdue',
  PREGNANCY_MILESTONE = 'pregnancy_milestone',
  GENERAL = 'general',
}

/**
 * Entidade de Notificação
 * Representa uma notificação enviada ou a ser enviada para um usuário
 */
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * ID do cidadão destinatário (UUID do Core Service)
   */
  @Column({ name: 'citizen_id', type: 'uuid' })
  citizenId: string;

  /**
   * Tipo de notificação
   */
  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.GENERAL,
  })
  type: NotificationType;

  /**
   * Canal de envio
   */
  @Column({
    type: 'enum',
    enum: NotificationChannel,
  })
  channel: NotificationChannel;

  /**
   * Status de envio
   */
  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  /**
   * Título da notificação
   */
  @Column({ length: 255 })
  title: string;

  /**
   * Corpo da mensagem
   */
  @Column({ type: 'text' })
  body: string;

  /**
   * Dados adicionais (JSON)
   */
  @Column({ type: 'jsonb', nullable: true })
  data?: Record<string, any>;

  /**
   * Data/hora de envio
   */
  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt?: Date;

  /**
   * Data/hora de entrega (quando aplicável)
   */
  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt?: Date;

  /**
   * Mensagem de erro (se falhou)
   */
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  /**
   * Número de tentativas de envio
   */
  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  /**
   * Data de agendamento (se for notificação agendada)
   */
  @Column({ name: 'scheduled_for', type: 'timestamp', nullable: true })
  scheduledFor?: Date;

  /**
   * ID externo (ex: ID do appointment, task, etc)
   */
  @Column({ name: 'external_id', type: 'varchar', nullable: true })
  externalId?: string;

  /**
   * Tipo da entidade externa (ex: 'appointment', 'task')
   */
  @Column({ name: 'external_type', type: 'varchar', nullable: true })
  externalType?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
