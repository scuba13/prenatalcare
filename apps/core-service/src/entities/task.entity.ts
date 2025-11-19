import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Pregnancy } from './pregnancy.entity';

@Entity('tasks')
@Index(['pregnancyId', 'status'])
@Index(['dueDate', 'status'])
@Index(['type', 'status'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relação com Gravidez
  @Column('uuid')
  @Index()
  pregnancyId: string;

  @ManyToOne(() => Pregnancy, (pregnancy) => pregnancy.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pregnancyId' })
  pregnancy: Pregnancy;

  // Informações Básicas
  @Column({
    type: 'enum',
    enum: ['consultation', 'exam', 'vaccine', 'ultrasound', 'education', 'procedure', 'medication', 'other'],
  })
  @Index()
  type: 'consultation' | 'exam' | 'vaccine' | 'ultrasound' | 'education' | 'procedure' | 'medication' | 'other';

  @Column({ length: 255 })
  title: string; // "Consulta Pré-Natal - 1º Trimestre"

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Datas
  @Column({ type: 'timestamp' })
  @Index()
  dueDate: Date; // Data limite/agendada

  @Column({ type: 'timestamp', nullable: true })
  completedDate: Date | null;

  // Status
  @Column({
    type: 'enum',
    enum: ['pending', 'in-progress', 'completed', 'cancelled', 'overdue'],
    default: 'pending',
  })
  @Index()
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled' | 'overdue';

  // Prioridade
  @Column({ type: 'int', default: 5 })
  priority: number; // 1 (mais alta) a 10 (mais baixa)

  @Column({
    type: 'enum',
    enum: ['routine', 'important', 'urgent', 'critical'],
    default: 'routine',
  })
  priorityLevel: 'routine' | 'important' | 'urgent' | 'critical';

  // Detalhes Clínicos
  @Column({ length: 50, nullable: true })
  clinicalCode: string | null; // LOINC ou SNOMED code

  @Column({ length: 255, nullable: true })
  clinicalCodeDisplay: string | null;

  // Profissional Responsável
  @Column({ length: 255, nullable: true })
  assignedTo: string | null; // ID ou nome do profissional

  @Column({ length: 255, nullable: true })
  performedBy: string | null; // Quem executou a tarefa

  // Local
  @Column({ length: 255, nullable: true })
  location: string | null; // "UBS Centro", "Hospital X"

  // Resultados e Observações
  @Column({ type: 'jsonb', nullable: true })
  outcome: {
    code?: string;
    value?: string | number;
    unit?: string;
    interpretation?: 'normal' | 'abnormal' | 'critical' | 'high' | 'low';
    reference?: string; // Valor de referência
    date?: string; // ISO date
  } | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null; // Observações gerais

  @Column({ type: 'text', nullable: true })
  cancellationReason: string | null;

  // Lembretes e Notificações
  @Column({ default: false })
  reminderSent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  reminderSentAt: Date | null;

  @Column({ type: 'jsonb', default: [] })
  notificationSchedule: Array<{
    type: 'sms' | 'email' | 'push';
    daysBeforeDue: number; // Quantos dias antes da data limite
    sent: boolean;
    sentAt?: string; // ISO timestamp
  }>;

  // Dependências
  @Column({ type: 'uuid', nullable: true })
  dependsOnTaskId: string | null; // ID de outra task que deve ser completada antes

  @Column({ type: 'jsonb', default: [] })
  prerequisites: Array<{
    type: 'task' | 'exam' | 'condition';
    description: string;
    completed: boolean;
  }>;

  // Recorrência
  @Column({ default: false })
  isRecurring: boolean;

  @Column({ type: 'jsonb', nullable: true })
  recurrence: {
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    interval: number; // A cada X semanas/meses
    until?: string; // ISO date - até quando recorre
    count?: number; // Quantas vezes repete
  } | null;

  // Anexos (referências a arquivos no MinIO)
  @Column({ type: 'jsonb', default: [] })
  attachments: Array<{
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    s3Key: string; // Chave no MinIO
    uploadedAt: string; // ISO timestamp
    uploadedBy: string;
  }>;

  // Auditoria
  @Column({ length: 255, nullable: true })
  createdBy: string | null; // ID do usuário que criou

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;

  // Métodos auxiliares
  isOverdue(): boolean {
    if (this.status === 'completed' || this.status === 'cancelled') {
      return false;
    }
    return new Date() > new Date(this.dueDate);
  }

  getDaysUntilDue(): number {
    const today = new Date();
    const due = new Date(this.dueDate);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDaysSinceCompleted(): number | null {
    if (!this.completedDate) return null;
    const today = new Date();
    const completed = new Date(this.completedDate);
    const diffTime = today.getTime() - completed.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  complete(performedBy?: string, outcome?: typeof this.outcome, notes?: string): void {
    this.status = 'completed';
    this.completedDate = new Date();
    if (performedBy) this.performedBy = performedBy;
    if (outcome) this.outcome = outcome;
    if (notes) this.notes = notes;
  }

  cancel(reason: string): void {
    this.status = 'cancelled';
    this.cancellationReason = reason;
  }

  markAsOverdue(): void {
    if (this.isOverdue() && this.status === 'pending') {
      this.status = 'overdue';
    }
  }

  shouldSendReminder(daysBeforeDue: number): boolean {
    const daysUntil = this.getDaysUntilDue();
    return daysUntil === daysBeforeDue && !this.reminderSent;
  }
}
