import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, Matches } from 'class-validator';

export class UpdatePreferenceDto {
  @ApiPropertyOptional({
    description: 'Push notifications habilitadas',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Email habilitado',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'SMS habilitado',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'FCM Token para push notifications',
    example: 'dkfj39fj3f9j3f9j3f9j3f...',
  })
  @IsOptional()
  @IsString()
  fcmToken?: string;

  @ApiPropertyOptional({
    description: 'Email do usuário',
    example: 'usuario@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Telefone (formato internacional)',
    example: '+5511999999999',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone must be in international format (e.g., +5511999999999)',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Horário de início do modo silencioso (HH:MM)',
    example: '22:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:MM format',
  })
  quietHoursStart?: string;

  @ApiPropertyOptional({
    description: 'Horário de fim do modo silencioso (HH:MM)',
    example: '07:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:MM format',
  })
  quietHoursEnd?: string;

  @ApiPropertyOptional({
    description: 'Lembretes de consultas habilitados',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  appointmentRemindersEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Lembretes de tarefas habilitados',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  taskRemindersEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Marcos da gravidez habilitados',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  pregnancyMilestonesEnabled?: boolean;
}
