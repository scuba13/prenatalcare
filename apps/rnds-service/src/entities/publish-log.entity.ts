import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Entidade para auditoria de publicações na RNDS.
 * Registra todas as requisições/respostas de envio de dados para RNDS.
 */
@Entity('publish_logs')
export class PublishLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * ID do Bundle FHIR enviado para RNDS
   * Cada publicação é um Bundle que pode conter múltiplos recursos
   */
  @Column({ length: 255, nullable: true })
  @Index()
  bundleId: string | null;

  /**
   * Tipo de operação realizada
   * - 'create': Criar novo recurso
   * - 'update': Atualizar recurso existente
   * - 'delete': Remover recurso
   * - 'transaction': Transação com múltiplas operações
   * - 'batch': Batch de operações independentes
   */
  @Column({
    type: 'enum',
    enum: ['create', 'update', 'delete', 'transaction', 'batch'],
  })
  @Index()
  operation: 'create' | 'update' | 'delete' | 'transaction' | 'batch';

  /**
   * Tipo de recurso FHIR principal
   * Exemplos: Patient, Condition, Observation, Bundle
   */
  @Column({ length: 50 })
  @Index()
  resourceType: string;

  /**
   * IDs dos recursos locais incluídos nesta publicação
   * Array de UUIDs separados por vírgula para facilitar busca
   */
  @Column({ type: 'text', nullable: true })
  resourceIds: string | null;

  /**
   * Status da publicação
   * - 'pending': Aguardando envio
   * - 'processing': Sendo processado pela RNDS
   * - 'success': Publicado com sucesso
   * - 'partial': Parcialmente bem-sucedido (alguns recursos falharam)
   * - 'failed': Falhou completamente
   * - 'rejected': Rejeitado pela RNDS (validação)
   */
  @Column({
    type: 'enum',
    enum: ['pending', 'processing', 'success', 'partial', 'failed', 'rejected'],
    default: 'pending',
  })
  @Index()
  status: 'pending' | 'processing' | 'success' | 'partial' | 'failed' | 'rejected';

  /**
   * Request HTTP completo (headers + body)
   * Armazena o Bundle FHIR enviado
   */
  @Column({ type: 'jsonb' })
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: any; // Bundle FHIR
  };

  /**
   * Response HTTP completo (status + headers + body)
   * Armazena a resposta da RNDS
   */
  @Column({ type: 'jsonb', nullable: true })
  response: {
    statusCode: number;
    headers: Record<string, string>;
    body: any; // OperationOutcome ou Bundle de resposta
  } | null;

  /**
   * Mensagem de erro em caso de falha
   * Extraída do OperationOutcome da RNDS ou erro de conexão
   */
  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  /**
   * Código de erro estruturado
   * Pode ser código HTTP ou código de erro FHIR
   */
  @Column({ length: 50, nullable: true })
  @Index()
  errorCode: string | null;

  /**
   * Tempo de resposta em milissegundos
   */
  @Column({ type: 'int', nullable: true })
  responseTime: number | null;

  /**
   * Timestamp de quando a requisição foi enviada
   */
  @Column({ type: 'timestamp', nullable: true })
  @Index()
  sentAt: Date | null;

  /**
   * Timestamp de quando a resposta foi recebida
   */
  @Column({ type: 'timestamp', nullable: true })
  receivedAt: Date | null;

  /**
   * Número de recursos incluídos no Bundle
   */
  @Column({ type: 'int', default: 0 })
  resourceCount: number;

  /**
   * Número de recursos que foram processados com sucesso
   */
  @Column({ type: 'int', default: 0 })
  successCount: number;

  /**
   * Número de recursos que falharam
   */
  @Column({ type: 'int', default: 0 })
  failureCount: number;

  /**
   * Detalhes de validação da RNDS
   * Issues extraídos do OperationOutcome
   */
  @Column({ type: 'jsonb', nullable: true })
  validationIssues: Array<{
    severity: 'fatal' | 'error' | 'warning' | 'information';
    code: string;
    details: string;
    diagnostics?: string;
    location?: string;
  }> | null;

  /**
   * Informações do usuário/sistema que iniciou a publicação
   */
  @Column({ length: 255, nullable: true })
  initiatedBy: string | null;

  /**
   * IP de origem da requisição
   */
  @Column({ length: 45, nullable: true })
  ipAddress: string | null;

  /**
   * Metadados adicionais (contexto, flags, etc.)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /**
   * Se true, indica que é um reenvio após falha
   */
  @Column({ default: false })
  isRetry: boolean;

  /**
   * ID do log original em caso de retry
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  originalLogId: string | null;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  // Helper methods

  /**
   * Marca a publicação como enviada
   */
  markSent(): void {
    this.status = 'processing';
    this.sentAt = new Date();
  }

  /**
   * Marca a publicação como bem-sucedida
   */
  markSuccess(response: any, responseTime: number): void {
    this.status = 'success';
    this.response = response;
    this.responseTime = responseTime;
    this.receivedAt = new Date();
    this.successCount = this.resourceCount;
    this.failureCount = 0;
  }

  /**
   * Marca a publicação como falha
   */
  markFailed(error: string, errorCode?: string, response?: any): void {
    this.status = 'failed';
    this.errorMessage = error;
    this.errorCode = errorCode || null;
    this.response = response || null;
    this.receivedAt = new Date();
    this.failureCount = this.resourceCount;
    this.successCount = 0;
  }

  /**
   * Marca a publicação como parcialmente bem-sucedida
   */
  markPartial(successCount: number, failureCount: number, response: any): void {
    this.status = 'partial';
    this.successCount = successCount;
    this.failureCount = failureCount;
    this.response = response;
    this.receivedAt = new Date();
  }

  /**
   * Extrai issues de validação do OperationOutcome
   */
  extractValidationIssues(operationOutcome: any): void {
    if (!operationOutcome || !operationOutcome.issue) {
      return;
    }

    this.validationIssues = operationOutcome.issue.map((issue: any) => ({
      severity: issue.severity,
      code: issue.code,
      details: issue.details?.text || issue.details?.coding?.[0]?.display || '',
      diagnostics: issue.diagnostics,
      location: issue.location?.[0] || issue.expression?.[0],
    }));

    // Se há erros fatais ou errors, marca como rejected
    const hasCriticalIssues = this.validationIssues.some(
      (issue) => issue.severity === 'fatal' || issue.severity === 'error',
    );

    if (hasCriticalIssues) {
      this.status = 'rejected';
    }
  }

  /**
   * Calcula tempo de resposta
   */
  calculateResponseTime(): void {
    if (this.sentAt && this.receivedAt) {
      this.responseTime = this.receivedAt.getTime() - this.sentAt.getTime();
    }
  }

  /**
   * Verifica se deve fazer retry
   */
  shouldRetry(): boolean {
    return (
      (this.status === 'failed' || this.status === 'rejected') &&
      !this.isRetry &&
      this.errorCode !== '400' && // Não retry em erros de validação
      this.errorCode !== '401' && // Não retry em erros de autenticação
      this.errorCode !== '403' // Não retry em erros de autorização
    );
  }
}
