import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Entidade para controlar o estado de sincronização bidirecional com RNDS.
 * Mantém registro da última sincronização de cada tipo de recurso FHIR.
 */
@Entity('sync_cursors')
@Index(['resourceType', 'identifier'], { unique: true })
export class SyncCursor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tipo de recurso FHIR que está sendo sincronizado
   * Exemplos: Patient, Condition, Observation, CarePlan, etc.
   */
  @Column({ length: 50 })
  @Index()
  resourceType: string;

  /**
   * Identificador único do recurso no sistema local
   * Pode ser o ID da cidadã, gravidez, observação, etc.
   */
  @Column({ length: 255 })
  identifier: string;

  /**
   * ID do recurso na RNDS (externalId)
   * Usado para mapear recursos locais para recursos FHIR na RNDS
   */
  @Column({ length: 255, nullable: true })
  externalId: string | null;

  /**
   * Data/hora da última sincronização bem-sucedida
   * Usado para sincronização incremental
   */
  @Column({ type: 'timestamp' })
  @Index()
  lastSyncedAt: Date;

  /**
   * Data/hora da última atualização do recurso no sistema local
   * Comparado com lastSyncedAt para determinar se precisa ressincronizar
   */
  @Column({ type: 'timestamp', nullable: true })
  lastUpdatedAt: Date | null;

  /**
   * Direção da última sincronização
   * - 'push': Dados enviados do sistema local para RNDS
   * - 'pull': Dados recebidos da RNDS para sistema local
   * - 'bidirectional': Sincronização bidirecional completa
   */
  @Column({
    type: 'enum',
    enum: ['push', 'pull', 'bidirectional'],
    default: 'push',
  })
  syncDirection: 'push' | 'pull' | 'bidirectional';

  /**
   * Status da sincronização
   * - 'synced': Em sincronia com RNDS
   * - 'pending': Pendente de sincronização
   * - 'error': Último sincronismo falhou
   * - 'conflict': Conflito detectado (dados divergentes)
   */
  @Column({
    type: 'enum',
    enum: ['synced', 'pending', 'error', 'conflict'],
    default: 'pending',
  })
  status: 'synced' | 'pending' | 'error' | 'conflict';

  /**
   * Hash do conteúdo sincronizado
   * Usado para detecção rápida de mudanças
   */
  @Column({ length: 64, nullable: true })
  contentHash: string | null;

  /**
   * Versão do recurso na RNDS (versionId do FHIR)
   * Usado para controle de concorrência otimista
   */
  @Column({ nullable: true })
  versionId: string | null;

  /**
   * Número de tentativas de sincronização em caso de erro
   */
  @Column({ type: 'int', default: 0 })
  retryCount: number;

  /**
   * Próximo horário para tentar ressincronizar em caso de erro
   * Implementa backoff exponencial
   */
  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt: Date | null;

  /**
   * Metadados adicionais (configurações, flags, etc.)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods

  /**
   * Verifica se o cursor precisa ser ressincronizado
   */
  needsSync(): boolean {
    if (this.status === 'pending' || this.status === 'error') {
      return true;
    }

    if (this.lastUpdatedAt && this.lastSyncedAt) {
      return this.lastUpdatedAt > this.lastSyncedAt;
    }

    return false;
  }

  /**
   * Marca a sincronização como bem-sucedida
   */
  markSynced(externalId?: string, versionId?: string): void {
    this.status = 'synced';
    this.lastSyncedAt = new Date();
    this.retryCount = 0;
    this.nextRetryAt = null;

    if (externalId) {
      this.externalId = externalId;
    }

    if (versionId) {
      this.versionId = versionId;
    }
  }

  /**
   * Marca a sincronização como erro e agenda retry com backoff exponencial
   */
  markError(): void {
    this.status = 'error';
    this.retryCount += 1;

    // Backoff exponencial: 1min, 2min, 4min, 8min, 16min, max 1 hora
    const delayMinutes = Math.min(Math.pow(2, this.retryCount - 1), 60);
    this.nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);
  }

  /**
   * Verifica se está pronto para retry
   */
  canRetry(): boolean {
    if (this.status !== 'error') {
      return false;
    }

    if (!this.nextRetryAt) {
      return true;
    }

    return new Date() >= this.nextRetryAt;
  }
}
