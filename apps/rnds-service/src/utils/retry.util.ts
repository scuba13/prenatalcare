import { Logger } from '@nestjs/common';

const logger = new Logger('RetryUtil');

/**
 * Opções para retry com backoff exponencial
 */
export interface RetryOptions {
  /** Número máximo de tentativas (padrão: 3) */
  maxRetries?: number;
  /** Delay base em milissegundos (padrão: 1000ms) */
  baseDelay?: number;
  /** Multiplicador do backoff (padrão: 2 para exponencial) */
  backoffMultiplier?: number;
  /** Delay máximo em milissegundos (padrão: 30000ms - 30s) */
  maxDelay?: number;
  /** Função para determinar se deve fazer retry baseado no erro */
  shouldRetry?: (error: any) => boolean;
  /** Nome da operação para logging */
  operationName?: string;
}

/**
 * Executa uma função com retry e backoff exponencial
 *
 * @param fn Função a ser executada
 * @param options Opções de retry
 * @returns Promise com o resultado da função
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => httpClient.get('/api/resource'),
 *   { maxRetries: 3, baseDelay: 1000, operationName: 'GET /api/resource' }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    backoffMultiplier = 2,
    maxDelay = 30000,
    shouldRetry = defaultShouldRetry,
    operationName = 'Operation',
  } = options;

  let lastError: any;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      // Primeira tentativa ou retry
      if (attempt > 0) {
        logger.log(`${operationName}: Retry attempt ${attempt}/${maxRetries}`);
      }

      const result = await fn();

      // Sucesso
      if (attempt > 0) {
        logger.log(`${operationName}: Succeeded on retry attempt ${attempt}`);
      }

      return result;
    } catch (error) {
      lastError = error;
      attempt++;

      // Verificar se deve fazer retry
      if (!shouldRetry(error)) {
        logger.warn(
          `${operationName}: Error is not retryable, aborting (${error.message})`,
        );
        throw error;
      }

      // Se atingiu o máximo de retries, lançar erro
      if (attempt > maxRetries) {
        logger.error(
          `${operationName}: Failed after ${maxRetries} retries`,
        );
        throw error;
      }

      // Calcular delay com backoff exponencial
      const exponentialDelay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
      const delay = Math.min(exponentialDelay, maxDelay);

      // Adicionar jitter (aleatoriedade) de ±25% para evitar thundering herd
      const jitter = delay * 0.25;
      const delayWithJitter = delay + (Math.random() * jitter * 2 - jitter);

      logger.warn(
        `${operationName}: Attempt ${attempt} failed (${error.message}), retrying in ${Math.round(delayWithJitter)}ms...`,
      );

      // Aguardar antes da próxima tentativa
      await sleep(delayWithJitter);
    }
  }

  // Nunca deveria chegar aqui, mas por segurança
  throw lastError;
}

/**
 * Função padrão para determinar se deve fazer retry
 * Faz retry em erros de rede e erros HTTP 5xx
 */
function defaultShouldRetry(error: any): boolean {
  // Erros de rede (timeout, connection refused, etc.)
  if (error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNRESET') {
    return true;
  }

  // Erros HTTP 5xx (server errors)
  if (error.response?.status >= 500 && error.response?.status < 600) {
    return true;
  }

  // 408 Request Timeout
  if (error.response?.status === 408) {
    return true;
  }

  // 429 Too Many Requests (rate limiting)
  if (error.response?.status === 429) {
    return true;
  }

  // 503 Service Unavailable
  if (error.response?.status === 503) {
    return true;
  }

  // Não fazer retry para outros erros (4xx client errors, etc.)
  return false;
}

/**
 * Função auxiliar para sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry específico para operações FHIR GET
 * Usa configurações otimizadas para leitura
 */
export async function retryFhirGet<T>(
  fn: () => Promise<T>,
  operationName?: string,
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 3,
    baseDelay: 1000, // 1s
    operationName: operationName || 'FHIR GET',
  });
}

/**
 * Retry específico para operações FHIR POST
 * Usa configurações mais conservadoras para escrita
 */
export async function retryFhirPost<T>(
  fn: () => Promise<T>,
  operationName?: string,
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 3,
    baseDelay: 2000, // 2s
    operationName: operationName || 'FHIR POST',
    shouldRetry: (error) => {
      // Não fazer retry em erros de validação ou conflito
      if (error.response?.status === 400 || // Bad Request
          error.response?.status === 409 || // Conflict
          error.response?.status === 422) { // Unprocessable Entity
        return false;
      }
      return defaultShouldRetry(error);
    },
  });
}

/**
 * Retry com circuit breaker simples
 * Interrompe retries se muitas falhas consecutivas ocorrerem
 */
export class CircuitBreaker {
  private failures = 0;
  private readonly threshold: number;
  private readonly resetTimeout: number;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private resetTimer?: NodeJS.Timeout;

  constructor(threshold = 5, resetTimeout = 60000) {
    this.threshold = threshold;
    this.resetTimeout = resetTimeout;
  }

  async execute<T>(fn: () => Promise<T>, operationName?: string): Promise<T> {
    if (this.state === 'open') {
      throw new Error(
        `Circuit breaker is OPEN for ${operationName || 'operation'}. Too many failures.`,
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state === 'half-open') {
      this.state = 'closed';
      logger.log('Circuit breaker: CLOSED (recovered)');
    }
  }

  private onFailure(): void {
    this.failures++;

    if (this.failures >= this.threshold) {
      this.state = 'open';
      logger.error(
        `Circuit breaker: OPEN (${this.failures} failures). Will retry in ${this.resetTimeout}ms`,
      );

      // Agendar reset
      if (this.resetTimer) {
        clearTimeout(this.resetTimer);
      }

      this.resetTimer = setTimeout(() => {
        this.state = 'half-open';
        this.failures = 0;
        logger.log('Circuit breaker: HALF-OPEN (testing)');
      }, this.resetTimeout);
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }
}
