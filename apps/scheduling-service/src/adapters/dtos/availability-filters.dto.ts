import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AvailabilityFiltersDto {
  @ApiProperty({
    description: 'Data inicial para buscar disponibilidade (ISO 8601)',
    example: '2025-11-20',
  })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({
    description: 'Data final para buscar disponibilidade (ISO 8601)',
    example: '2025-11-27',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'ID do profissional de saúde',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsString()
  @IsOptional()
  professionalId?: string;

  @ApiPropertyOptional({
    description: 'Especialidade médica',
    example: 'Obstetrícia',
  })
  @IsString()
  @IsOptional()
  specialty?: string;
}
