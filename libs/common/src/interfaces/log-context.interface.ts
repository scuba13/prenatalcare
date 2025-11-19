/**
 * Contexto do log com metadados estruturados
 */
export interface LogContext {
  /** ID único da requisição */
  requestId?: string;
  /** Nome do contexto (Controller, Service, etc.) */
  context?: string;
  /** ID do usuário (se autenticado) */
  userId?: string;
  /** CPF ou identificador do paciente */
  patientId?: string;
  /** Método HTTP */
  method?: string;
  /** URL da requisição */
  url?: string;
  /** Status HTTP da resposta */
  statusCode?: number;
  /** Tempo de duração em ms */
  duration?: number;
  /** IP do cliente */
  ip?: string;
  /** User-Agent */
  userAgent?: string;
  /** Dados adicionais customizados */
  [key: string]: any;
}

/**
 * Níveis de log
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly',
}

/**
 * Configuração do logger
 */
export interface LoggerConfig {
  /** Nível mínimo de log */
  level?: LogLevel;
  /** Habilitar logs em arquivo */
  enableFile?: boolean;
  /** Diretório dos arquivos de log */
  logDir?: string;
  /** Habilitar rotação de arquivos */
  enableRotation?: boolean;
  /** Pretty print (desenvolvimento) */
  prettyPrint?: boolean;
  /** Habilitar logs no console */
  enableConsole?: boolean;
  /** Nome da aplicação */
  appName?: string;
}
