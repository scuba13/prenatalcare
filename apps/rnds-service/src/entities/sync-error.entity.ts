import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Entidade para rastrear e gerenciar erros de sincronização.
 * Permite análise de padrões de erro, debug e retry inteligente.
 */
@Entity('sync_errors')
export class SyncError {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tipo de operação que gerou o erro
   * - 'push': Erro ao enviar dados para RNDS
   * - 'pull': Erro ao buscar dados da RNDS
   * - 'validation': Erro de validação de dados
   * - 'mapping': Erro ao mapear FHIR ↔ Domínio
   * - 'network': Erro de conexão/rede
   * - 'auth': Erro de autenticação
   */
  @Column({
    type: 'enum',
    enum: ['push', 'pull', 'validation', 'mapping', 'network', 'auth'],
  })
  @Index()
  operation: 'push' | 'pull' | 'validation' | 'mapping' | 'network' | 'auth';

  /**
   * Tipo de recurso FHIR envolvido no erro
   */
  @Column({ length: 50 })
  @Index()
  resourceType: string;

  /**
   * ID do recurso local que gerou o erro
   */
  @Column({ length: 255, nullable: true })
  @Index()
  resourceId: string | null;

  /**
   * ID externo do recurso na RNDS (se disponível)
   */
  @Column({ length: 255, nullable: true })
  externalId: string | null;

  /**
   * Mensagem de erro principal
   */
  @Column({ type: 'text' })
  errorMessage: string;

  /**
   * Código de erro estruturado
   * Pode ser:
   * - Código HTTP (400, 401, 403, 404, 500, etc.)
   * - Código FHIR (invalid, structure, required, etc.)
   * - Código customizado da aplicação
   */
  @Column({ length: 50, nullable: true })
  @Index()
  errorCode: string | null;

  /**
   * Tipo/categoria do erro
   * - 'client': Erro do cliente (4xx)
   * - 'server': Erro do servidor (5xx)
   * - 'validation': Erro de validação
   * - 'business': Erro de regra de negócio
   * - 'timeout': Timeout de requisição
   * - 'unknown': Erro não categorizado
   */
  @Column({
    type: 'enum',
    enum: ['client', 'server', 'validation', 'business', 'timeout', 'unknown'],
    default: 'unknown',
  })
  @Index()
  errorType: 'client' | 'server' | 'validation' | 'business' | 'timeout' | 'unknown';

  /**
   * Severidade do erro
   * - 'fatal': Sistema não pode continuar
   * - 'error': Operação falhou mas sistema continua
   * - 'warning': Problema não crítico
   * - 'info': Informativo
   */
  @Column({
    type: 'enum',
    enum: ['fatal', 'error', 'warning', 'info'],
    default: 'error',
  })
  @Index()
  severity: 'fatal' | 'error' | 'warning' | 'info';

  /**
   * Stack trace completo do erro
   * Útil para debug em desenvolvimento
   */
  @Column({ type: 'text', nullable: true })
  stackTrace: string | null;

  /**
   * Contexto adicional do erro
   * Pode incluir: payload, headers, estado do sistema, etc.
   */
  @Column({ type: 'jsonb', nullable: true })
  context: {
    payload?: any;
    headers?: Record<string, string>;
    url?: string;
    method?: string;
    requestId?: string;
    userId?: string;
    [key: string]: any;
  } | null;

  /**
   * Response HTTP completo (se disponível)
   */
  @Column({ type: 'jsonb', nullable: true })
  response: {
    statusCode: number;
    headers?: Record<string, string>;
    body?: any;
  } | null;

  /**
   * OperationOutcome FHIR completo (se erro veio da RNDS)
   */
  @Column({ type: 'jsonb', nullable: true })
  operationOutcome: any | null;

  /**
   * Número de tentativas de retry já realizadas
   */
  @Column({ type: 'int', default: 0 })
  retryCount: number;

  /**
   * Máximo de retries permitidos
   */
  @Column({ type: 'int', default: 3 })
  maxRetries: number;

  /**
   * Próximo horário agendado para retry
   */
  @Column({ type: 'timestamp', nullable: true })
  @Index()
  nextRetryAt: Date | null;

  /**
   * Timestamp da última tentativa
   */
  @Column({ type: 'timestamp', nullable: true })
  lastAttemptAt: Date | null;

  /**
   * Status do erro
   * - 'open': Erro não resolvido
   * - 'retrying': Em processo de retry
   * - 'resolved': Erro foi resolvido
   * - 'ignored': Erro foi marcado para ignorar
   * - 'escalated': Erro escalado para revisão manual
   */
  @Column({
    type: 'enum',
    enum: ['open', 'retrying', 'resolved', 'ignored', 'escalated'],
    default: 'open',
  })
  @Index()
  status: 'open' | 'retrying' | 'resolved' | 'ignored' | 'escalated';

  /**
   * Se resolvido, como foi resolvido
   */
  @Column({ type: 'text', nullable: true })
  resolutionNote: string | null;

  /**
   * Timestamp de quando foi resolvido
   */
  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  /**
   * ID do usuário/sistema que resolveu o erro
   */
  @Column({ length: 255, nullable: true })
  resolvedBy: string | null;

  /**
   * Se true, indica que é um erro recorrente/pattern conhecido
   */
  @Column({ default: false })
  @Index()
  isRecurring: boolean;

  /**
   * Número de vezes que este mesmo erro ocorreu
   */
  @Column({ type: 'int', default: 1 })
  occurrenceCount: number;

  /**
   * ID do log de publicação relacionado (se aplicável)
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  publishLogId: string | null;

  /**
   * ID do cursor de sync relacionado (se aplicável)
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  syncCursorId: string | null;

  /**
   * Metadados adicionais
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods

  /**
   * Incrementa contador de retry e agenda próxima tentativa
   */
  scheduleRetry(): void {
    this.retryCount += 1;
    this.status = 'retrying';
    this.lastAttemptAt = new Date();

    if (this.retryCount >= this.maxRetries) {
      this.status = 'escalated';
      this.nextRetryAt = null;
      return;
    }

    // Backoff exponencial: 1min, 5min, 15min, 30min, 1h, 2h, max 4h
    const delays = [1, 5, 15, 30, 60, 120, 240]; // em minutos
    const delayMinutes = delays[Math.min(this.retryCount - 1, delays.length - 1)];
    this.nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);
  }

  /**
   * Marca o erro como resolvido
   */
  markResolved(note?: string, resolvedBy?: string): void {
    this.status = 'resolved';
    this.resolvedAt = new Date();
    this.resolutionNote = note || null;
    this.resolvedBy = resolvedBy || null;
    this.nextRetryAt = null;
  }

  /**
   * Marca o erro para ignorar
   */
  ignore(reason?: string): void {
    this.status = 'ignored';
    this.resolutionNote = reason || 'Ignored by user';
    this.nextRetryAt = null;
  }

  /**
   * Verifica se pode fazer retry
   */
  canRetry(): boolean {
    if (this.status === 'resolved' || this.status === 'ignored') {
      return false;
    }

    if (this.retryCount >= this.maxRetries) {
      return false;
    }

    if (!this.nextRetryAt) {
      return true;
    }

    return new Date() >= this.nextRetryAt;
  }

  /**
   * Verifica se é um erro temporário que deve ser retriado
   */
  isTemporary(): boolean {
    if (!this.errorCode) {
      return false;
    }

    const temporaryErrorCodes = [
      '408', // Request Timeout
      '429', // Too Many Requests
      '500', // Internal Server Error
      '502', // Bad Gateway
      '503', // Service Unavailable
      '504', // Gateway Timeout
    ];

    return temporaryErrorCodes.includes(this.errorCode);
  }

  /**
   * Categoriza o tipo de erro baseado no código
   */
  categorizeError(): void {
    if (!this.errorCode) {
      this.errorType = 'unknown';
      return;
    }

    const code = parseInt(this.errorCode, 10);

    if (isNaN(code)) {
      this.errorType = 'unknown';
      return;
    }

    if (code >= 400 && code < 500) {
      this.errorType = 'client';
    } else if (code >= 500 && code < 600) {
      this.errorType = 'server';
    } else if (code === 408 || code === 504) {
      this.errorType = 'timeout';
    }
  }

  /**
   * Extrai informações do OperationOutcome FHIR
   */
  extractFromOperationOutcome(operationOutcome: any): void {
    this.operationOutcome = operationOutcome;

    if (!operationOutcome || !operationOutcome.issue) {
      return;
    }

    // Pega o issue mais severo
    const issues = operationOutcome.issue;
    const severityOrder = { fatal: 0, error: 1, warning: 2, information: 3 };

    const mostSevere = issues.reduce((prev: any, curr: any) => {
      const prevSeverity = severityOrder[prev.severity as keyof typeof severityOrder] ?? 999;
      const currSeverity = severityOrder[curr.severity as keyof typeof severityOrder] ?? 999;
      return currSeverity < prevSeverity ? curr : prev;
    }, issues[0]);

    if (mostSevere) {
      this.severity = mostSevere.severity;
      this.errorCode = mostSevere.code;
      this.errorMessage =
        mostSevere.diagnostics ||
        mostSevere.details?.text ||
        mostSevere.details?.coding?.[0]?.display ||
        this.errorMessage;
    }
  }
}
