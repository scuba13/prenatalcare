/**
 * Formato padronizado de resposta de erro
 */
export interface ErrorResponse {
  /** Timestamp do erro */
  timestamp: string;
  /** Path da requisição */
  path: string;
  /** Método HTTP */
  method: string;
  /** Status code HTTP */
  statusCode: number;
  /** Tipo do erro */
  error: string;
  /** Mensagem de erro */
  message: string | string[];
  /** ID único da requisição para rastreamento */
  requestId?: string;
  /** Stack trace (apenas em desenvolvimento) */
  stack?: string;
  /** Detalhes adicionais do erro */
  details?: any;
}

/**
 * Erro de validação
 */
export interface ValidationError {
  /** Campo com erro */
  field: string;
  /** Valor inválido */
  value?: any;
  /** Mensagens de erro */
  constraints: string[];
}
