import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsEnum, IsOptional, IsArray } from 'class-validator';

export class CreateCarePlanDto {
  @ApiProperty({ description: 'UUID da gestação', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  pregnancyId: string;

  @ApiProperty({ description: 'Título do plano de cuidado', example: 'Plano de pré-natal de baixo risco' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Descrição do plano', example: 'Acompanhamento de rotina para gestação de baixo risco' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Status do plano',
    enum: ['draft', 'active', 'on_hold', 'completed', 'cancelled'],
    example: 'draft'
  })
  @IsEnum(['draft', 'active', 'on_hold', 'completed', 'cancelled'])
  status: 'draft' | 'active' | 'on_hold' | 'completed' | 'cancelled';

  @ApiPropertyOptional({ description: 'Data de início', example: '2025-03-15' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data de término', example: '2025-11-15' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Atividades do plano',
    example: [{
      id: '1',
      title: 'Consultas mensais',
      description: 'Consultas pré-natais de rotina',
      status: 'scheduled',
      scheduledDate: '2025-04-15T10:00:00Z'
    }]
  })
  @IsOptional()
  @IsArray()
  activities?: Array<{
    id: string;
    title: string;
    description?: string;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    scheduledDate?: Date;
    completedDate?: Date;
    outcome?: any;
  }>;

  @ApiPropertyOptional({
    description: 'Objetivos do plano',
    example: [{
      id: '1',
      description: 'Manter peso adequado',
      target: 'Ganho de 11-16kg durante gestação',
      achieved: false
    }]
  })
  @IsOptional()
  @IsArray()
  goals?: Array<{
    id: string;
    description: string;
    target?: string;
    achieved: boolean;
    achievedDate?: Date;
  }>;

  @ApiPropertyOptional({ description: 'Recomendações', example: 'Ácido fólico 400mcg/dia, Sulfato ferroso 40mg/dia' })
  @IsOptional()
  @IsString()
  recommendations?: string;

  @ApiPropertyOptional({ description: 'Observações', example: 'Gestante vegetariana, ajustar suplementação' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Data da próxima visita', example: '2025-12-15T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  nextVisit?: string;
}
