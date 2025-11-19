import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Citizen } from './citizen.entity';
import { CarePlan } from './care-plan.entity';
import { Task } from './task.entity';

@Entity('pregnancies')
@Index(['citizenId', 'status'])
export class Pregnancy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relação com Cidadã
  @Column('uuid')
  @Index()
  citizenId: string;

  @ManyToOne(() => Citizen, (citizen) => citizen.pregnancies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'citizenId' })
  citizen: Citizen;

  // Dados Obstétricos
  @Column({ type: 'date' })
  lastMenstrualPeriod: Date; // Data da Última Menstruação (DUM)

  @Column({ type: 'date' })
  estimatedDueDate: Date; // Data Provável do Parto (DPP)

  @Column({ type: 'int', default: 0 })
  gestationalWeeks: number; // Semanas completas

  @Column({ type: 'int', default: 0 })
  gestationalDays: number; // Dias adicionais (0-6)

  @Column({
    type: 'enum',
    enum: ['active', 'completed', 'terminated'],
    default: 'active',
  })
  @Index()
  status: 'active' | 'completed' | 'terminated';

  // Histórico Obstétrico
  @Column({ type: 'int', default: 0 })
  gravida: number; // Número de gestações (incluindo atual)

  @Column({ type: 'int', default: 0 })
  para: number; // Número de partos

  @Column({ type: 'int', default: 0 })
  cesarean: number; // Número de cesáreas

  @Column({ type: 'int', default: 0 })
  abortions: number; // Número de abortos

  @Column({ type: 'int', default: 0 })
  liveBirths: number; // Número de nascidos vivos

  // Classificação de Risco
  @Column({
    type: 'enum',
    enum: ['habitual', 'intermediario', 'alto'],
    default: 'habitual',
  })
  riskLevel: 'habitual' | 'intermediario' | 'alto';

  @Column({ type: 'jsonb', default: [] })
  riskFactors: Array<{
    code: string; // Código LOINC ou SNOMED
    display: string; // "Diabetes gestacional", "Hipertensão"
    severity?: 'low' | 'moderate' | 'high';
    detectedAt: string; // ISO date
  }>;

  // Tipo de Gravidez
  @Column({
    type: 'enum',
    enum: ['singleton', 'twin', 'triplet', 'multiple'],
    default: 'singleton',
  })
  pregnancyType: 'singleton' | 'twin' | 'triplet' | 'multiple';

  // Desfecho (quando status = completed ou terminated)
  @Column({ type: 'date', nullable: true })
  outcomeDate: Date | null; // Data do parto ou término

  @Column({
    type: 'enum',
    enum: ['vaginal', 'cesarean', 'forceps', 'vacuum'],
    nullable: true,
  })
  deliveryMethod: 'vaginal' | 'cesarean' | 'forceps' | 'vacuum' | null;

  @Column({ type: 'text', nullable: true })
  outcomeNotes: string | null; // Observações sobre o desfecho

  // Dados Clínicos Complementares
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  prePregnancyWeight: number | null; // Peso pré-gestacional (kg)

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  height: number | null; // Altura (m)

  @Column({ type: 'jsonb', default: [] })
  medications: Array<{
    name: string;
    dose: string;
    frequency: string;
    startDate: string; // ISO date
    endDate?: string; // ISO date
  }>;

  @Column({ type: 'jsonb', default: [] })
  vaccinations: Array<{
    name: string; // "dTpa", "Hepatite B"
    dose: string;
    date: string; // ISO date
    lot?: string;
  }>;

  // Auditoria
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;

  // Relações
  @OneToMany(() => CarePlan, (carePlan) => carePlan.pregnancy)
  carePlans: CarePlan[];

  @OneToMany(() => Task, (task) => task.pregnancy)
  tasks: Task[];

  // Métodos auxiliares
  calculateGestationalAge(): { weeks: number; days: number } {
    const today = new Date();
    const lmp = new Date(this.lastMenstrualPeriod);
    const diffTime = Math.abs(today.getTime() - lmp.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;

    return { weeks, days };
  }

  updateGestationalAge(): void {
    const { weeks, days } = this.calculateGestationalAge();
    this.gestationalWeeks = weeks;
    this.gestationalDays = days;
  }

  getTrimester(): 1 | 2 | 3 | null {
    if (this.gestationalWeeks < 0) return null;
    if (this.gestationalWeeks <= 13) return 1;
    if (this.gestationalWeeks <= 27) return 2;
    return 3;
  }

  getDaysUntilDueDate(): number {
    const today = new Date();
    const dueDate = new Date(this.estimatedDueDate);
    const diffTime = dueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  isHighRisk(): boolean {
    return this.riskLevel === 'alto' || this.riskFactors.length > 0;
  }

  calculateBMI(): number | null {
    if (!this.prePregnancyWeight || !this.height) return null;
    return this.prePregnancyWeight / (this.height * this.height);
  }
}
