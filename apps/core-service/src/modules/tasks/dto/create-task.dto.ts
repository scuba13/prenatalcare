import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ description: 'UUID da gestação', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  pregnancyId: string;

  @ApiProperty({
    description: 'Tipo da tarefa',
    enum: ['consultation', 'exam', 'vaccine', 'ultrasound', 'education', 'procedure', 'medication', 'other'],
    example: 'consultation'
  })
  @IsEnum(['consultation', 'exam', 'vaccine', 'ultrasound', 'education', 'procedure', 'medication', 'other'])
  type: 'consultation' | 'exam' | 'vaccine' | 'ultrasound' | 'education' | 'procedure' | 'medication' | 'other';

  @ApiProperty({ description: 'Título da tarefa', example: 'Consulta Pré-Natal - 1º Trimestre' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Descrição da tarefa', example: 'Primeira consulta do pré-natal' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Data de vencimento', example: '2025-12-01T10:00:00Z' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({ description: 'Prioridade numérica (1=alta, 10=baixa)', example: 5, minimum: 1, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  priority?: number;

  @ApiPropertyOptional({
    description: 'Nível de prioridade',
    enum: ['routine', 'important', 'urgent', 'critical'],
    example: 'routine'
  })
  @IsOptional()
  @IsEnum(['routine', 'important', 'urgent', 'critical'])
  priorityLevel?: 'routine' | 'important' | 'urgent' | 'critical';

  @ApiPropertyOptional({ description: 'Código clínico (LOINC/SNOMED)', example: '11636-8' })
  @IsOptional()
  @IsString()
  clinicalCode?: string;

  @ApiPropertyOptional({ description: 'Descrição do código clínico', example: 'Hemograma completo' })
  @IsOptional()
  @IsString()
  clinicalCodeDisplay?: string;

  @ApiPropertyOptional({ description: 'Profissional responsável', example: 'Dr. João Silva' })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Local de realização', example: 'UBS Centro' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Observações', example: 'Trazer exames anteriores' })
  @IsOptional()
  @IsString()
  notes?: string;
}
