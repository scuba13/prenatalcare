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

@Entity('care_plans')
@Index(['pregnancyId', 'status'])
export class CarePlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relação com Gravidez
  @Column('uuid')
  @Index()
  pregnancyId: string;

  @ManyToOne(() => Pregnancy, (pregnancy) => pregnancy.carePlans, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pregnancyId' })
  pregnancy: Pregnancy;

  // Informações Básicas
  @Column({ length: 255 })
  title: string; // "Plano de Cuidado Pré-Natal - 1º Trimestre"

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({
    type: 'enum',
    enum: ['draft', 'active', 'completed', 'cancelled'],
    default: 'draft',
  })
  @Index()
  status: 'draft' | 'active' | 'completed' | 'cancelled';

  // Responsável pelo Plano
  @Column({ length: 255, nullable: true })
  createdBy: string | null; // ID ou nome do profissional

  @Column({ length: 255, nullable: true })
  lastReviewedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lastReviewedAt: Date | null;

  // Atividades do Plano (conforme FHIR CarePlan.activity)
  @Column({ type: 'jsonb', default: [] })
  activities: Array<{
    id: string; // UUID da atividade
    type: 'consultation' | 'exam' | 'vaccine' | 'education' | 'procedure';
    title: string;
    description?: string;

    // Timing
    scheduledDate?: string; // ISO date
    completedDate?: string; // ISO date

    // Status
    status: 'not-started' | 'in-progress' | 'completed' | 'cancelled' | 'on-hold';

    // Detalhes clínicos
    code?: string; // LOINC ou SNOMED code
    performer?: string; // Profissional responsável
    location?: string; // Local do atendimento

    // Prioridade
    priority?: 'routine' | 'urgent' | 'asap' | 'stat';

    // Outcome
    outcome?: {
      code: string;
      value: string;
      unit?: string;
      interpretation?: 'normal' | 'abnormal' | 'critical';
    };

    // Notas
    notes?: string;
  }>;

  // Goals do Plano (conforme FHIR Goal)
  @Column({ type: 'jsonb', default: [] })
  goals: Array<{
    id: string;
    description: string; // "Manter pressão arterial < 140/90 mmHg"
    category: 'clinical' | 'behavioral' | 'dietary' | 'safety';
    priority: 'high' | 'medium' | 'low';
    status: 'proposed' | 'accepted' | 'active' | 'on-hold' | 'completed' | 'cancelled';
    startDate?: string;
    targetDate?: string;
    achievementStatus?: 'in-progress' | 'improving' | 'worsening' | 'no-change' | 'achieved' | 'sustaining' | 'not-achieved';
    target?: {
      measure: string; // "Pressão Arterial Sistólica"
      value: string; // "< 140"
      unit?: string; // "mmHg"
    };
  }>;

  // Orientações e Recomendações
  @Column({ type: 'jsonb', default: [] })
  recommendations: Array<{
    category: 'nutrition' | 'activity' | 'medication' | 'lifestyle' | 'warning-signs';
    title: string;
    description: string;
    importance: 'high' | 'medium' | 'low';
  }>;

  // Próximas Consultas Recomendadas
  @Column({ type: 'jsonb', nullable: true })
  nextVisit: {
    recommendedDate: string; // ISO date
    reason: string;
    type: 'routine' | 'follow-up' | 'urgent';
    notes?: string;
  } | null;

  // Auditoria
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;

  // Métodos auxiliares
  getCompletionPercentage(): number {
    if (this.activities.length === 0) return 0;

    const completedActivities = this.activities.filter(
      (a) => a.status === 'completed'
    ).length;

    return Math.round((completedActivities / this.activities.length) * 100);
  }

  getPendingActivities(): typeof this.activities {
    return this.activities.filter(
      (a) => a.status === 'not-started' || a.status === 'in-progress'
    );
  }

  getOverdueActivities(): typeof this.activities {
    const today = new Date();
    return this.activities.filter((a) => {
      if (!a.scheduledDate || a.status === 'completed' || a.status === 'cancelled') {
        return false;
      }
      return new Date(a.scheduledDate) < today;
    });
  }

  getUpcomingActivities(daysAhead: number = 7): typeof this.activities {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.activities.filter((a) => {
      if (!a.scheduledDate || a.status === 'completed' || a.status === 'cancelled') {
        return false;
      }
      const activityDate = new Date(a.scheduledDate);
      return activityDate >= today && activityDate <= futureDate;
    });
  }

  isActive(): boolean {
    const today = new Date();
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);

    return (
      this.status === 'active' &&
      today >= start &&
      today <= end
    );
  }

  getDuration(): number {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // days
  }
}
