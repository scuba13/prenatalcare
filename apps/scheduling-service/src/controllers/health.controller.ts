import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SchedulingService } from '../services/scheduling.service';
import { CircuitBreakerService, CircuitState } from '../resilience/circuit-breaker.service';
import { RetryService } from '../resilience/retry.service';

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  adapter: {
    name: string;
    healthy: boolean;
  };
  circuitBreaker: {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailureTime?: Date;
    lastStateChange?: Date;
  };
  retry: {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
  };
}

/**
 * Controller responsável pelos endpoints de health check.
 *
 * Retorna informações sobre:
 * - Status geral do serviço
 * - Health do adapter externo
 * - Estado do circuit breaker
 * - Configuração de retry
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly schedulingService: SchedulingService,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly retryService: RetryService,
  ) {}

  /**
   * Health check completo do serviço
   */
  @Get()
  @ApiOperation({
    summary: 'Health check do serviço',
    description:
      'Verifica a saúde do serviço, adapter externo, circuit breaker e configurações de resiliência',
  })
  @ApiResponse({
    status: 200,
    description: 'Status do serviço',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['healthy', 'degraded', 'unhealthy'],
          example: 'healthy',
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2025-11-19T10:30:00.000Z',
        },
        adapter: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'MockSchedulingAdapter' },
            healthy: { type: 'boolean', example: true },
          },
        },
        circuitBreaker: {
          type: 'object',
          properties: {
            state: {
              type: 'string',
              enum: ['CLOSED', 'OPEN', 'HALF_OPEN'],
              example: 'CLOSED',
            },
            failures: { type: 'number', example: 0 },
            successes: { type: 'number', example: 0 },
            lastFailureTime: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            lastStateChange: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
          },
        },
        retry: {
          type: 'object',
          properties: {
            maxAttempts: { type: 'number', example: 3 },
            baseDelayMs: { type: 'number', example: 1000 },
            maxDelayMs: { type: 'number', example: 30000 },
          },
        },
      },
    },
  })
  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      // 1. Verifica health do adapter
      const adapterHealth = await this.schedulingService.healthCheck();

      // 2. Obtém estatísticas do circuit breaker
      const cbStats = this.circuitBreakerService.getStats();

      // 3. Obtém configuração de retry
      const retryConfig = this.retryService.getDefaultOptions();

      // 4. Determina status geral
      let status: 'healthy' | 'degraded' | 'unhealthy';

      if (!adapterHealth.healthy) {
        status = 'unhealthy';
      } else if (cbStats.state === CircuitState.OPEN) {
        status = 'degraded';
      } else if (cbStats.state === CircuitState.HALF_OPEN) {
        status = 'degraded';
      } else {
        status = 'healthy';
      }

      return {
        status,
        timestamp: new Date().toISOString(),
        adapter: {
          name: adapterHealth.adapter,
          healthy: adapterHealth.healthy,
        },
        circuitBreaker: {
          state: cbStats.state,
          failures: cbStats.failures,
          successes: cbStats.successes,
          lastFailureTime: cbStats.lastFailureTime,
          lastStateChange: cbStats.lastStateChange,
        },
        retry: {
          maxAttempts: retryConfig.maxAttempts,
          baseDelayMs: retryConfig.baseDelayMs,
          maxDelayMs: retryConfig.maxDelayMs,
        },
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`, error.stack);

      // Retorna status unhealthy em caso de erro
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        adapter: {
          name: 'unknown',
          healthy: false,
        },
        circuitBreaker: {
          state: CircuitState.OPEN,
          failures: 0,
          successes: 0,
        },
        retry: {
          maxAttempts: 0,
          baseDelayMs: 0,
          maxDelayMs: 0,
        },
      };
    }
  }

  /**
   * Endpoint simplificado para liveness probe (Kubernetes)
   */
  @Get('live')
  @ApiOperation({
    summary: 'Liveness probe',
    description: 'Endpoint simplificado para verificar se o serviço está rodando',
  })
  @ApiResponse({
    status: 200,
    description: 'Serviço está rodando',
    schema: {
      type: 'object',
      properties: {
        alive: { type: 'boolean', example: true },
      },
    },
  })
  liveness(): { alive: boolean } {
    return { alive: true };
  }

  /**
   * Endpoint para readiness probe (Kubernetes)
   */
  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe',
    description: 'Verifica se o serviço está pronto para receber tráfego',
  })
  @ApiResponse({
    status: 200,
    description: 'Serviço está pronto',
    schema: {
      type: 'object',
      properties: {
        ready: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Serviço não está pronto (circuit breaker aberto)',
  })
  async readiness(): Promise<{ ready: boolean }> {
    // Considera "ready" se circuit breaker não está OPEN
    const cbState = this.circuitBreakerService.getState();
    const ready = cbState !== CircuitState.OPEN;

    if (!ready) {
      this.logger.warn('Readiness check failed: Circuit breaker is OPEN');
    }

    return { ready };
  }
}
