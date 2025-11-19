import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsEnum, IsOptional, IsNumber, IsObject, Min } from 'class-validator';

export class CreatePregnancyDto {
  @ApiProperty({ description: 'UUID do cidadão/gestante', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  citizenId: string;

  @ApiProperty({ description: 'Data da última menstruação (DUM)', example: '2025-03-01' })
  @IsDateString()
  lastMenstrualPeriod: string;

  @ApiPropertyOptional({ description: 'Número de gestações (incluindo atual)', example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  gravida?: number;

  @ApiPropertyOptional({ description: 'Número de partos anteriores', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  para?: number;

  @ApiPropertyOptional({ description: 'Número de abortos anteriores', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  abortions?: number;

  @ApiPropertyOptional({ description: 'Número de filhos vivos', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  livingChildren?: number;

  @ApiPropertyOptional({ description: 'Peso inicial da gestante (kg)', example: 65.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  initialWeight?: number;

  @ApiPropertyOptional({ description: 'Altura da gestante (cm)', example: 165 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  height?: number;

  @ApiPropertyOptional({ description: 'Observações iniciais', example: 'Gestação planejada' })
  @IsOptional()
  @IsString()
  notes?: string;
}
