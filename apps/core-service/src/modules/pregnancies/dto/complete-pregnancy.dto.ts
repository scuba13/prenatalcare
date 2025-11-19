import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class CompletePregnancyDto {
  @ApiProperty({ description: 'Resultado da gestação', enum: ['live_birth', 'stillbirth', 'miscarriage', 'termination'] })
  @IsEnum(['live_birth', 'stillbirth', 'miscarriage', 'termination'])
  outcome: 'live_birth' | 'stillbirth' | 'miscarriage' | 'termination';

  @ApiProperty({ description: 'Data do parto/término', example: '2025-11-15' })
  @IsDateString()
  deliveryDate: string;

  @ApiPropertyOptional({ description: 'Tipo de parto', enum: ['vaginal', 'cesarean', 'forceps', 'vacuum'] })
  @IsOptional()
  @IsEnum(['vaginal', 'cesarean', 'forceps', 'vacuum'])
  deliveryType?: 'vaginal' | 'cesarean' | 'forceps' | 'vacuum';

  @ApiPropertyOptional({ description: 'Peso do recém-nascido (gramas)', example: 3250 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  birthWeight?: number;

  @ApiPropertyOptional({ description: 'Comprimento do recém-nascido (cm)', example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  birthLength?: number;

  @ApiPropertyOptional({ description: 'Perímetro cefálico (cm)', example: 35 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  headCircumference?: number;

  @ApiPropertyOptional({ description: 'APGAR no 1º minuto', example: 8 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  apgarScore1?: number;

  @ApiPropertyOptional({ description: 'APGAR no 5º minuto', example: 9 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  apgarScore5?: number;

  @ApiPropertyOptional({ description: 'Complicações', example: 'Nenhuma' })
  @IsOptional()
  @IsString()
  complications?: string;

  @ApiPropertyOptional({ description: 'Observações', example: 'Parto sem intercorrências' })
  @IsOptional()
  @IsString()
  notes?: string;
}
