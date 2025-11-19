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
import { Citizen } from './citizen.entity';

@Entity('clinical_observations')
@Index(['pregnancyId', 'loincCode', 'effectiveDateTime'])
@Index(['citizenId', 'loincCode', 'effectiveDateTime'])
export class ClinicalObservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relação com Cidadã (opcional - pode ser independente da gravidez)
  @Column('uuid', { nullable: true })
  @Index()
  citizenId: string | null;

  @ManyToOne(() => Citizen, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'citizenId' })
  citizen: Citizen;

  // Relação com Gravidez (opcional - algumas observações não são específicas de gravidez)
  @Column('uuid', { nullable: true })
  @Index()
  pregnancyId: string | null;

  @ManyToOne(() => Pregnancy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pregnancyId' })
  pregnancy: Pregnancy;

  // Código LOINC (obrigatório para FHIR)
  @Column({ length: 20 })
  @Index()
  loincCode: string; // Ex: "29463-7" (Body weight), "718-7" (Hemoglobin)

  @Column({ length: 255 })
  display: string; // Ex: "Body weight", "Hemoglobin [Mass/volume] in Blood"

  // Categoria FHIR Observation
  @Column({
    type: 'enum',
    enum: ['vital-signs', 'laboratory', 'exam', 'procedure', 'survey', 'social-history'],
    default: 'vital-signs',
  })
  @Index()
  category: 'vital-signs' | 'laboratory' | 'exam' | 'procedure' | 'survey' | 'social-history';

  // Valor da observação
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value: number;

  @Column({ length: 50 })
  unit: string; // Ex: "kg", "mmHg", "g/dL", "cm"

  @Column({ length: 100, nullable: true })
  unitSystem: string | null; // Ex: "http://unitsofmeasure.org" (UCUM)

  @Column({ length: 20, nullable: true })
  unitCode: string | null; // Ex: "kg", "mm[Hg]", "g/dL"

  // Data/hora da medição (obrigatório FHIR)
  @Column({ type: 'timestamp' })
  @Index()
  effectiveDateTime: Date;

  // Status da observação (FHIR Observation.status)
  @Column({
    type: 'enum',
    enum: ['registered', 'preliminary', 'final', 'amended', 'corrected', 'cancelled', 'entered-in-error'],
    default: 'final',
  })
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error';

  // Interpretação do resultado (FHIR Observation.interpretation)
  @Column({
    type: 'enum',
    enum: ['N', 'L', 'H', 'LL', 'HH', 'A', 'AA'],
    nullable: true,
  })
  interpretation: 'N' | 'L' | 'H' | 'LL' | 'HH' | 'A' | 'AA' | null;
  // N = Normal, L = Low, H = High, LL = Critically Low, HH = Critically High, A = Abnormal, AA = Critically Abnormal

  // Valores de referência (JSONB)
  @Column({ type: 'jsonb', nullable: true })
  referenceRange: {
    low?: number;
    high?: number;
    text?: string;
    appliesTo?: string; // Ex: "gestantes", "adultos"
  } | null;

  // Componentes (para observações compostas como Pressão Arterial)
  @Column({ type: 'jsonb', nullable: true })
  components: Array<{
    loincCode: string; // Ex: "8480-6" (Systolic), "8462-4" (Diastolic)
    display: string;
    value: number;
    unit: string;
    unitCode?: string;
  }> | null;

  // Método de medição (opcional)
  @Column({ length: 255, nullable: true })
  method: string | null; // Ex: "Auscultação", "Automático", "Manual"

  // Local da medição (opcional)
  @Column({ length: 255, nullable: true })
  bodySite: string | null; // Ex: "Braço esquerdo", "Veia antecubital"

  // Profissional que realizou/registrou (opcional)
  @Column({ length: 255, nullable: true })
  performer: string | null; // ID ou nome do profissional

  // Notas clínicas adicionais
  @Column({ type: 'text', nullable: true })
  note: string | null;

  // Identificador externo (para sincronização RNDS)
  @Column({ length: 255, nullable: true, unique: true })
  externalId: string | null; // ID da observação na RNDS, se sincronizada

  // Metadados de sincronização
  @Column({ type: 'timestamp', nullable: true })
  lastSyncedAt: Date | null; // Última vez que foi sincronizada com RNDS

  @Column({ default: false })
  syncedToRnds: boolean; // Se foi enviada para RNDS

  // Auditoria
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;

  // Métodos auxiliares
  isAbnormal(): boolean {
    return this.interpretation !== null && this.interpretation !== 'N';
  }

  isCritical(): boolean {
    return this.interpretation === 'LL' || this.interpretation === 'HH' || this.interpretation === 'AA';
  }

  isWithinReferenceRange(): boolean {
    if (!this.referenceRange) return true;

    const { low, high } = this.referenceRange;

    if (low !== undefined && this.value < low) return false;
    if (high !== undefined && this.value > high) return false;

    return true;
  }

  getInterpretationText(): string {
    const map = {
      N: 'Normal',
      L: 'Abaixo do normal',
      H: 'Acima do normal',
      LL: 'Criticamente baixo',
      HH: 'Criticamente alto',
      A: 'Anormal',
      AA: 'Criticamente anormal',
    };

    return this.interpretation ? map[this.interpretation] : 'Sem interpretação';
  }

  // Formata valor com unidade para exibição
  getFormattedValue(): string {
    return `${this.value} ${this.unit}`;
  }

  // Retorna descrição completa
  getDescription(): string {
    return `${this.display}: ${this.getFormattedValue()}`;
  }
}
