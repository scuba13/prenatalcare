import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsObject } from 'class-validator';
import { NotificationChannel, NotificationType } from '../entities/notification.entity';

export class SendNotificationDto {
  @ApiProperty({
    description: 'ID do cidadão destinatário',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  citizenId: string;

  @ApiProperty({
    description: 'Tipo de notificação',
    enum: NotificationType,
    example: NotificationType.APPOINTMENT_REMINDER,
  })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @ApiProperty({
    description: 'Canal de envio',
    enum: NotificationChannel,
    example: NotificationChannel.PUSH,
  })
  @IsEnum(NotificationChannel)
  @IsNotEmpty()
  channel: NotificationChannel;

  @ApiProperty({
    description: 'Título da notificação',
    example: 'Lembrete de Consulta',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Corpo da mensagem',
    example: 'Você tem uma consulta agendada para amanhã às 14:00',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({
    description: 'Dados adicionais (JSON)',
    example: { appointmentId: '123', date: '2025-11-20' },
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'ID externo (ex: ID do appointment)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional({
    description: 'Tipo da entidade externa',
    example: 'appointment',
  })
  @IsOptional()
  @IsString()
  externalType?: string;
}
