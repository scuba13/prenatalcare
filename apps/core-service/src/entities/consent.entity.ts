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
import { Citizen } from './citizen.entity';

@Entity('consents')
@Index(['citizenId', 'purpose'])
@Index(['granted', 'purpose'])
export class Consent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relação com Cidadã
  @Column('uuid')
  @Index()
  citizenId: string;

  @ManyToOne(() => Citizen, (citizen) => citizen.consents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'citizenId' })
  citizen: Citizen;

  // Finalidade do Consentimento (conforme LGPD Art. 7º)
  @Column({
    type: 'enum',
    enum: [
      'data_processing',       // Processamento geral de dados
      'data_sharing',          // Compartilhamento com terceiros
      'data_sharing_rnds',     // Compartilhamento específico com RNDS
      'research',              // Uso em pesquisas científicas
      'marketing',             // Comunicações de marketing
      'anonymized_statistics', // Estatísticas anonimizadas
      'health_monitoring',     // Monitoramento de saúde
      'emergency_contact',     // Contato em emergências
    ],
  })
  @Index()
  purpose:
    | 'data_processing'
    | 'data_sharing'
    | 'data_sharing_rnds'
    | 'research'
    | 'marketing'
    | 'anonymized_statistics'
    | 'health_monitoring'
    | 'emergency_contact';

  // Descrição Detalhada
  @Column({ type: 'text' })
  description: string; // Descrição clara e específica do que está sendo consentido

  @Column({ type: 'text', nullable: true })
  legalBasis: string | null; // Base legal (Art. 7º, inciso específico)

  // Status do Consentimento
  @Column({ default: false })
  @Index()
  granted: boolean; // true = consentido, false = negado/revogado

  @Column({ type: 'timestamp', nullable: true })
  grantedAt: Date | null; // Data/hora que concedeu

  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date | null; // Data/hora que revogou

  @Column({ type: 'text', nullable: true })
  revocationReason: string | null; // Motivo da revogação

  // Rastreabilidade (LGPD Art. 37)
  @Column({ length: 45, nullable: true })
  ipAddress: string | null; // IP de onde o consentimento foi dado

  @Column({ type: 'text', nullable: true })
  userAgent: string | null; // Browser/device usado

  @Column({ length: 50, nullable: true })
  consentMethod: string | null; // "web_form", "mobile_app", "in_person", "phone"

  @Column({ type: 'text', nullable: true })
  digitalSignature: string | null; // Hash ou assinatura digital

  // Versão do Termo
  @Column({ length: 50, default: '1.0' })
  termsVersion: string; // Versão do termo de consentimento aceito

  @Column({ type: 'text', nullable: true })
  termsUrl: string | null; // URL do termo aceito (para auditoria)

  // Validade Temporal
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null; // Alguns consentimentos podem ter prazo de validade

  @Column({ default: false })
  requiresRenewal: boolean; // Se precisa renovar periodicamente

  @Column({ type: 'int', nullable: true })
  renewalPeriodDays: number | null; // A cada quantos dias deve renovar

  // Escopo e Limitações
  @Column({ type: 'jsonb', default: [] })
  dataCategories: string[]; // ["dados_cadastrais", "dados_clinicos", "dados_sensíveis"]

  @Column({ type: 'jsonb', default: [] })
  allowedRecipients: string[]; // ["RNDS", "SUS", "Pesquisadores credenciados"]

  @Column({ type: 'jsonb', default: [] })
  restrictions: Array<{
    type: 'time_limit' | 'data_type' | 'purpose' | 'recipient' | 'geographic';
    description: string;
    value: string;
  }>;

  // Consentimento de Menores (se aplicável)
  @Column({ default: false })
  isMinorConsent: boolean; // Se é consentimento de menor de idade

  @Column({ type: 'uuid', nullable: true })
  parentGuardianId: string | null; // ID do responsável legal

  @Column({ length: 255, nullable: true })
  parentGuardianName: string | null;

  // Histórico de Mudanças
  @Column({ type: 'jsonb', default: [] })
  changeHistory: Array<{
    timestamp: string; // ISO datetime
    action: 'granted' | 'revoked' | 'modified' | 'renewed';
    previousState?: boolean;
    newState?: boolean;
    modifiedBy?: string; // ID do usuário que fez a mudança
    reason?: string;
    ipAddress?: string;
  }>;

  // Notificações
  @Column({ default: false })
  notificationSent: boolean; // Se notificou o titular sobre o consentimento

  @Column({ type: 'timestamp', nullable: true })
  notificationSentAt: Date | null;

  // Compliance
  @Column({ default: false })
  isLgpdCompliant: boolean; // Se está em conformidade com LGPD

  @Column({ type: 'text', nullable: true })
  complianceNotes: string | null;

  // Auditoria
  @Column({ length: 255, nullable: true })
  createdBy: string | null; // Quem registrou o consentimento (pode ser o próprio cidadão)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null; // Soft delete (para fins de auditoria)

  // Métodos auxiliares
  isActive(): boolean {
    if (!this.granted) return false;
    if (this.revokedAt) return false;
    if (this.expiresAt && new Date() > new Date(this.expiresAt)) return false;
    return true;
  }

  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > new Date(this.expiresAt);
  }

  needsRenewal(): boolean {
    if (!this.requiresRenewal || !this.renewalPeriodDays || !this.grantedAt) {
      return false;
    }

    const grantDate = new Date(this.grantedAt);
    const today = new Date();
    const daysSinceGrant = Math.floor(
      (today.getTime() - grantDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceGrant >= this.renewalPeriodDays;
  }

  getDaysUntilExpiration(): number | null {
    if (!this.expiresAt) return null;

    const today = new Date();
    const expiry = new Date(this.expiresAt);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  revoke(reason?: string, revokedBy?: string): void {
    this.granted = false;
    this.revokedAt = new Date();
    if (reason) this.revocationReason = reason;

    this.changeHistory.push({
      timestamp: new Date().toISOString(),
      action: 'revoked',
      previousState: true,
      newState: false,
      modifiedBy: revokedBy,
      reason,
    });
  }

  renew(grantedBy?: string): void {
    this.granted = true;
    this.grantedAt = new Date();
    this.revokedAt = null;
    this.revocationReason = null;

    if (this.renewalPeriodDays) {
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + this.renewalPeriodDays);
      this.expiresAt = newExpiry;
    }

    this.changeHistory.push({
      timestamp: new Date().toISOString(),
      action: 'renewed',
      previousState: false,
      newState: true,
      modifiedBy: grantedBy,
    });
  }

  canShareWith(recipient: string): boolean {
    if (!this.isActive()) return false;
    if (this.allowedRecipients.length === 0) return true; // Sem restrições
    return this.allowedRecipients.includes(recipient);
  }
}
