import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Entidade de Preferências de Notificação do Usuário
 * Armazena as configurações de cada usuário sobre como deseja receber notificações
 */
@Entity('user_preferences')
@Index(['citizenId'], { unique: true })
export class UserPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * ID do cidadão (UUID do Core Service)
   */
  @Column({ name: 'citizen_id', type: 'uuid', unique: true })
  citizenId: string;

  /**
   * Push Notifications habilitadas
   */
  @Column({ name: 'push_enabled', type: 'boolean', default: true })
  pushEnabled: boolean;

  /**
   * Email habilitado
   */
  @Column({ name: 'email_enabled', type: 'boolean', default: true })
  emailEnabled: boolean;

  /**
   * SMS habilitado
   */
  @Column({ name: 'sms_enabled', type: 'boolean', default: false })
  smsEnabled: boolean;

  /**
   * FCM Token (Firebase Cloud Messaging) para push notifications
   */
  @Column({ name: 'fcm_token', type: 'varchar', length: 500, nullable: true })
  fcmToken?: string;

  /**
   * Email do usuário
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  /**
   * Telefone do usuário (formato internacional)
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  /**
   * Idioma preferido (ISO 639-1)
   */
  @Column({ type: 'varchar', length: 5, default: 'pt-BR' })
  language: string;

  /**
   * Timezone do usuário (IANA timezone)
   */
  @Column({ type: 'varchar', length: 50, default: 'America/Sao_Paulo' })
  timezone: string;

  /**
   * Horário de início para envio de notificações (formato HH:MM)
   */
  @Column({ name: 'quiet_hours_start', type: 'time', nullable: true })
  quietHoursStart?: string;

  /**
   * Horário de fim para envio de notificações (formato HH:MM)
   */
  @Column({ name: 'quiet_hours_end', type: 'time', nullable: true })
  quietHoursEnd?: string;

  /**
   * Notificações de lembretes de consulta habilitadas
   */
  @Column({
    name: 'appointment_reminders_enabled',
    type: 'boolean',
    default: true,
  })
  appointmentRemindersEnabled: boolean;

  /**
   * Notificações de lembretes de tarefas habilitadas
   */
  @Column({ name: 'task_reminders_enabled', type: 'boolean', default: true })
  taskRemindersEnabled: boolean;

  /**
   * Notificações de marcos da gravidez habilitadas
   */
  @Column({
    name: 'pregnancy_milestones_enabled',
    type: 'boolean',
    default: true,
  })
  pregnancyMilestonesEnabled: boolean;

  /**
   * Data da última atualização do FCM token
   */
  @Column({ name: 'fcm_token_updated_at', type: 'timestamp', nullable: true })
  fcmTokenUpdatedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Verifica se notificações estão ativas em um canal específico
   */
  isChannelEnabled(channel: 'push' | 'email' | 'sms'): boolean {
    switch (channel) {
      case 'push':
        return this.pushEnabled && !!this.fcmToken;
      case 'email':
        return this.emailEnabled && !!this.email;
      case 'sms':
        return this.smsEnabled && !!this.phone;
      default:
        return false;
    }
  }

  /**
   * Verifica se está no horário de silêncio (quiet hours)
   */
  isQuietHours(now: Date = new Date()): boolean {
    if (!this.quietHoursStart || !this.quietHoursEnd) {
      return false;
    }

    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    return (
      currentTime >= this.quietHoursStart && currentTime <= this.quietHoursEnd
    );
  }
}
