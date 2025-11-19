import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

@Entity('appointments')
export class Appointment {
  @ApiProperty({
    description: 'ID único do agendamento',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiPropertyOptional({
    description: 'ID do agendamento no sistema externo',
    example: 'MOCK-1732004567-abc123',
  })
  @Column({ name: 'external_id', nullable: true })
  externalId?: string;

  @ApiProperty({
    description: 'Tipo de adapter utilizado',
    example: 'MockSchedulingAdapter',
  })
  @Column({ name: 'adapter_type' })
  adapterType: string;

  @ApiProperty({
    description: 'ID da gestante',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ name: 'patient_id' })
  patientId: string;

  @ApiPropertyOptional({
    description: 'ID do profissional de saúde',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @Column({ name: 'professional_id', nullable: true })
  professionalId?: string;

  @ApiProperty({
    description: 'Data e hora agendada',
    example: '2025-11-20T14:00:00.000Z',
  })
  @Column({ type: 'timestamp', name: 'scheduled_at' })
  scheduledAt: Date;

  @ApiPropertyOptional({
    description: 'Data e hora de início real',
    example: '2025-11-20T14:05:00.000Z',
  })
  @Column({ type: 'timestamp', name: 'started_at', nullable: true })
  startedAt?: Date;

  @ApiPropertyOptional({
    description: 'Data e hora de conclusão',
    example: '2025-11-20T14:45:00.000Z',
  })
  @Column({ type: 'timestamp', name: 'completed_at', nullable: true })
  completedAt?: Date;

  @ApiProperty({
    description: 'Status do agendamento',
    enum: AppointmentStatus,
    example: AppointmentStatus.CONFIRMED,
  })
  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.PENDING,
  })
  status: AppointmentStatus;

  @ApiPropertyOptional({
    description: 'Observações sobre o agendamento',
    example: 'Consulta pré-natal de rotina',
  })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Metadados específicos do adapter',
    example: { location: 'Sala 101', specialty: 'Obstetrícia' },
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Data de criação do registro',
    example: '2025-11-19T10:00:00.000Z',
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização',
    example: '2025-11-19T10:30:00.000Z',
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
