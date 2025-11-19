import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsObject } from 'class-validator';

export class CompleteTaskDto {
  @ApiPropertyOptional({ description: 'Quem executou a tarefa', example: 'Dr. João Silva' })
  @IsOptional()
  @IsString()
  performedBy?: string;

  @ApiPropertyOptional({
    description: 'Resultado da tarefa',
    example: {
      code: 'normal',
      value: '12.5',
      unit: 'g/dL',
      interpretation: 'normal'
    }
  })
  @IsOptional()
  @IsObject()
  outcome?: {
    code?: string;
    value?: string | number;
    unit?: string;
    interpretation?: 'normal' | 'abnormal' | 'critical' | 'high' | 'low';
    reference?: string;
    date?: string;
  };

  @ApiPropertyOptional({ description: 'Observações sobre a conclusão', example: 'Exame realizado com sucesso' })
  @IsOptional()
  @IsString()
  notes?: string;
}
