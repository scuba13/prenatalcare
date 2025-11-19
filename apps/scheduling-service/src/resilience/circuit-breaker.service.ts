import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'CLOSED', // Tudo funcionando normalmente
  OPEN = 'OPEN', // Muitas falhas, circuit aberto (não executa operações)
  HALF_OPEN = 'HALF_OPEN', // Testando se o sistema voltou
}

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Número de falhas para abrir o circuit (padrão: 5)
  successThreshold?: number; // Número de sucessos para fechar do HALF_OPEN (padrão: 2)
  timeout?: number; // Tempo em ms para tentar HALF_OPEN (padrão: 60000ms = 1min)
}

interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: Date;
  lastStateChange?: Date;
}

/**
 * Service que implementa o padrão Circuit Breaker.
 *
 * Estados:
 * - CLOSED: Funcionamento normal, requisições passam
 * - OPEN: Sistema com problemas, requisições são rejeitadas imediatamente
 * - HALF_OPEN: Período de teste, permite algumas requisições para verificar recuperação
 *
 * Transições:
 * - CLOSED → OPEN: Após atingir failureThreshold falhas consecutivas
 * - OPEN → HALF_OPEN: Após timeout desde a última falha
 * - HALF_OPEN → CLOSED: Após successThreshold sucessos consecutivos
 * - HALF_OPEN → OPEN: Se ocorrer uma falha durante teste
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly options: Required<CircuitBreakerOptions>;
  private readonly stats: CircuitBreakerStats;

  constructor() {
    this.options = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 1 minuto
    };

    this.stats = {
      state: CircuitState.CLOSED,
      failures: 0,
      successes: 0,
    };

    this.logger.log('Circuit Breaker initialized in CLOSED state');
  }

  /**
   * Executa uma operação através do circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Verifica estado atual
    this.checkState();

    if (this.stats.state === CircuitState.OPEN) {
      throw new ServiceUnavailableException(
        'Circuit breaker is OPEN - service temporarily unavailable',
      );
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Verifica se deve transitar de OPEN para HALF_OPEN
   */
  private checkState(): void {
    if (
      this.stats.state === CircuitState.OPEN &&
      this.stats.lastFailureTime
    ) {
      const timeSinceLastFailure =
        Date.now() - this.stats.lastFailureTime.getTime();

      if (timeSinceLastFailure >= this.options.timeout) {
        this.logger.log(
          `Transitioning from OPEN to HALF_OPEN after ${timeSinceLastFailure}ms`,
        );
        this.setState(CircuitState.HALF_OPEN);
        this.stats.successes = 0;
      }
    }
  }

  /**
   * Callback quando operação é bem-sucedida
   */
  private onSuccess(): void {
    this.stats.failures = 0;

    if (this.stats.state === CircuitState.HALF_OPEN) {
      this.stats.successes++;

      this.logger.debug(
        `Success in HALF_OPEN (${this.stats.successes}/${this.options.successThreshold})`,
      );

      if (this.stats.successes >= this.options.successThreshold) {
        this.logger.log('Transitioning from HALF_OPEN to CLOSED');
        this.setState(CircuitState.CLOSED);
        this.stats.successes = 0;
      }
    }
  }

  /**
   * Callback quando operação falha
   */
  private onFailure(): void {
    this.stats.failures++;
    this.stats.lastFailureTime = new Date();

    this.logger.warn(
      `Failure recorded (${this.stats.failures}/${this.options.failureThreshold}) in ${this.stats.state} state`,
    );

    if (this.stats.state === CircuitState.HALF_OPEN) {
      // Uma única falha em HALF_OPEN volta para OPEN
      this.logger.warn('Transitioning from HALF_OPEN back to OPEN');
      this.setState(CircuitState.OPEN);
      this.stats.successes = 0;
    } else if (
      this.stats.state === CircuitState.CLOSED &&
      this.stats.failures >= this.options.failureThreshold
    ) {
      this.logger.error(
        `Failure threshold reached (${this.stats.failures}/${this.options.failureThreshold}) - Opening circuit`,
      );
      this.setState(CircuitState.OPEN);
    }
  }

  /**
   * Altera o estado do circuit breaker
   */
  private setState(newState: CircuitState): void {
    const oldState = this.stats.state;
    this.stats.state = newState;
    this.stats.lastStateChange = new Date();
    this.stats.failures = 0;

    this.logger.log(`State changed: ${oldState} → ${newState}`);
  }

  /**
   * Retorna estatísticas do circuit breaker
   */
  getStats(): Readonly<CircuitBreakerStats> {
    return {
      ...this.stats,
      lastFailureTime: this.stats.lastFailureTime
        ? new Date(this.stats.lastFailureTime)
        : undefined,
      lastStateChange: this.stats.lastStateChange
        ? new Date(this.stats.lastStateChange)
        : undefined,
    };
  }

  /**
   * Retorna o estado atual
   */
  getState(): CircuitState {
    this.checkState(); // Atualiza estado se necessário
    return this.stats.state;
  }

  /**
   * Verifica se o circuit está aberto
   */
  isOpen(): boolean {
    return this.getState() === CircuitState.OPEN;
  }

  /**
   * Reseta o circuit breaker (útil para testes)
   */
  reset(): void {
    this.logger.warn('Circuit Breaker manually reset');
    this.setState(CircuitState.CLOSED);
    this.stats.failures = 0;
    this.stats.successes = 0;
    this.stats.lastFailureTime = undefined;
  }
}
