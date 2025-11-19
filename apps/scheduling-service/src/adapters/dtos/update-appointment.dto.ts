import { IsDateString, IsOptional, IsString, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAppointmentDto {
  @ApiPropertyOptional({
    description: 'Nova data e hora do agendamento (ISO 8601)',
    example: '2025-11-21T10:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @ApiPropertyOptional({
    description: 'ID do profissional de saúde',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsString()
  @IsOptional()
  professionalId?: string;

  @ApiPropertyOptional({
    description: 'Observações sobre o agendamento',
    example: 'Reagendado a pedido da paciente',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Metadados adicionais específicos do adapter',
    example: { location: 'Sala 102' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
