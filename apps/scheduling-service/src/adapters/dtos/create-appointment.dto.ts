import { IsString, IsDateString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAppointmentDto {
  @ApiProperty({
    description: 'ID da gestante no Core Service',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  patientId: string;

  @ApiPropertyOptional({
    description: 'ID do profissional de saúde',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsString()
  @IsOptional()
  professionalId?: string;

  @ApiProperty({
    description: 'Data e hora do agendamento (ISO 8601)',
    example: '2025-11-20T14:00:00Z',
  })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({
    description: 'Observações sobre o agendamento',
    example: 'Consulta pré-natal de rotina',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Metadados adicionais específicos do adapter',
    example: { location: 'Sala 101', specialty: 'Obstetrícia' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
