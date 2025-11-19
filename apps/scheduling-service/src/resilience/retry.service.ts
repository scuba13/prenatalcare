import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RetryOptions {
  maxAttempts?: number; // Número máximo de tentativas (padrão: 3)
  baseDelayMs?: number; // Delay base em ms (padrão: 1000ms)
  maxDelayMs?: number; // Delay máximo em ms (padrão: 30000ms)
  exponentialBase?: number; // Base para backoff exponencial (padrão: 2)
}

/**
 * Service responsável por implementar retry com backoff exponencial.
 *
 * Estratégia de retry:
 * - Tentativa 1: Imediato
 * - Tentativa 2: baseDelay * exponentialBase^1 (1s * 2^1 = 2s)
 * - Tentativa 3: baseDelay * exponentialBase^2 (1s * 2^2 = 4s)
 * - Tentativa 4: baseDelay * exponentialBase^3 (1s * 2^3 = 8s)
 * ...
 *
 * Com jitter aleatório para evitar thundering herd.
 */
@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);
  private readonly defaultOptions: Required<RetryOptions>;

  constructor(private readonly config: ConfigService) {
    this.defaultOptions = {
      maxAttempts: this.config.get('ADAPTER_RETRY_ATTEMPTS', 3),
      baseDelayMs: 1000, // 1s
      maxDelayMs: 30000, // 30s
      exponentialBase: 2,
    };
  }

  /**
   * Executa uma operação com retry e backoff exponencial
   */
  async execute<T>(
    operation: () => Promise<T>,
    options?: RetryOptions,
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        this.logger.debug(`Attempt ${attempt}/${opts.maxAttempts}`);
        return await operation();
      } catch (error) {
        lastError = error;

        this.logger.warn(
          `Attempt ${attempt}/${opts.maxAttempts} failed: ${error.message}`,
        );

        // Se foi a última tentativa, não faz retry
        if (attempt >= opts.maxAttempts) {
          this.logger.error(`All ${opts.maxAttempts} attempts failed`);
          break;
        }

        // Calcula delay com backoff exponencial
        const delay = this.calculateDelay(attempt, opts);

        this.logger.debug(`Waiting ${delay}ms before next attempt`);

        await this.sleep(delay);
      }
    }

    throw new RetryExhaustedException(
      `Operation failed after ${opts.maxAttempts} attempts`,
      lastError,
    );
  }

  /**
   * Calcula o delay com backoff exponencial e jitter
   */
  private calculateDelay(attempt: number, options: Required<RetryOptions>): number {
    // Backoff exponencial: baseDelay * exponentialBase^(attempt - 1)
    const exponentialDelay =
      options.baseDelayMs * Math.pow(options.exponentialBase, attempt - 1);

    // Aplica limite máximo
    const cappedDelay = Math.min(exponentialDelay, options.maxDelayMs);

    // Adiciona jitter aleatório (±25%)
    const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);

    return Math.max(0, cappedDelay + jitter);
  }

  /**
   * Helper para sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retorna as configurações padrão
   */
  getDefaultOptions(): Required<RetryOptions> {
    return { ...this.defaultOptions };
  }
}

/**
 * Exceção lançada quando todas as tentativas de retry falharam
 */
export class RetryExhaustedException extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'RetryExhaustedException';

    // Preserva stack trace da causa original
    if (cause && cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}
