import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsDateString, IsEnum, IsOptional, IsUUID, IsBoolean, IsObject } from 'class-validator';

export class CreateObservationDto {
  @ApiPropertyOptional({ description: 'ID da cidadã (opcional se pregnancyId fornecido)', example: 'd6047410-80ef-4775-bbf6-f3b54fec72f9' })
  @IsOptional()
  @IsUUID()
  citizenId?: string;

  @ApiPropertyOptional({ description: 'ID da gravidez (opcional)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID()
  pregnancyId?: string;

  @ApiProperty({ description: 'Código LOINC da observação', example: '29463-7' })
  @IsString()
  @IsNotEmpty()
  loincCode: string;

  @ApiProperty({ description: 'Nome/descrição da observação', example: 'Body weight' })
  @IsString()
  @IsNotEmpty()
  display: string;

  @ApiProperty({
    description: 'Categoria da observação',
    enum: ['vital-signs', 'laboratory', 'exam', 'procedure', 'survey', 'social-history'],
    example: 'vital-signs'
  })
  @IsEnum(['vital-signs', 'laboratory', 'exam', 'procedure', 'survey', 'social-history'])
  category: 'vital-signs' | 'laboratory' | 'exam' | 'procedure' | 'survey' | 'social-history';

  @ApiProperty({ description: 'Valor numérico da observação', example: 68.5 })
  @IsNumber()
  value: number;

  @ApiProperty({ description: 'Unidade de medida', example: 'kg' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiPropertyOptional({ description: 'Sistema da unidade (UCUM)', example: 'http://unitsofmeasure.org' })
  @IsOptional()
  @IsString()
  unitSystem?: string;

  @ApiPropertyOptional({ description: 'Código da unidade', example: 'kg' })
  @IsOptional()
  @IsString()
  unitCode?: string;

  @ApiProperty({ description: 'Data/hora da medição', example: '2025-11-18T10:00:00Z' })
  @IsDateString()
  effectiveDateTime: string;

  @ApiPropertyOptional({
    description: 'Status da observação',
    enum: ['registered', 'preliminary', 'final', 'amended', 'corrected', 'cancelled', 'entered-in-error'],
    default: 'final'
  })
  @IsOptional()
  @IsEnum(['registered', 'preliminary', 'final', 'amended', 'corrected', 'cancelled', 'entered-in-error'])
  status?: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error';

  @ApiPropertyOptional({
    description: 'Interpretação do resultado',
    enum: ['N', 'L', 'H', 'LL', 'HH', 'A', 'AA'],
    example: 'N'
  })
  @IsOptional()
  @IsEnum(['N', 'L', 'H', 'LL', 'HH', 'A', 'AA'])
  interpretation?: 'N' | 'L' | 'H' | 'LL' | 'HH' | 'A' | 'AA';

  @ApiPropertyOptional({
    description: 'Valores de referência',
    example: { low: 60, high: 80, text: 'Valores de referência para gestantes' }
  })
  @IsOptional()
  @IsObject()
  referenceRange?: {
    low?: number;
    high?: number;
    text?: string;
    appliesTo?: string;
  };

  @ApiPropertyOptional({
    description: 'Componentes (para observações compostas como PA)',
    example: [
      { loincCode: '8480-6', display: 'Systolic blood pressure', value: 120, unit: 'mmHg', unitCode: 'mm[Hg]' },
      { loincCode: '8462-4', display: 'Diastolic blood pressure', value: 80, unit: 'mmHg', unitCode: 'mm[Hg]' }
    ]
  })
  @IsOptional()
  components?: Array<{
    loincCode: string;
    display: string;
    value: number;
    unit: string;
    unitCode?: string;
  }>;

  @ApiPropertyOptional({ description: 'Método de medição', example: 'Automático' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ description: 'Local da medição no corpo', example: 'Braço esquerdo' })
  @IsOptional()
  @IsString()
  bodySite?: string;

  @ApiPropertyOptional({ description: 'Profissional que realizou', example: 'Dr. João Silva' })
  @IsOptional()
  @IsString()
  performer?: string;

  @ApiPropertyOptional({ description: 'Notas clínicas adicionais', example: 'Paciente em jejum' })
  @IsOptional()
  @IsString()
  note?: string;
}
