import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLoggerService } from '../logger/logger.service';
import { ErrorResponse, ValidationError } from '../interfaces/error-response.interface';

/**
 * Filter para capturar erros de validação (class-validator)
 * Formata as mensagens de validação de forma mais amigável
 */
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('ValidationExceptionFilter');
  }

  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse: any = exception.getResponse();

    let validationErrors: ValidationError[] = [];
    let message: string | string[] = exception.message;

    // Se for erro de validação do class-validator
    if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      Array.isArray(exceptionResponse.message)
    ) {
      // Tenta parsear as mensagens de validação
      try {
        validationErrors = this.parseValidationErrors(exceptionResponse.message);
        message = 'Validation failed';
      } catch (error) {
        // Se não conseguir parsear, usa as mensagens como estão
        message = exceptionResponse.message;
      }
    }

    const errorResponse: ErrorResponse = {
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      statusCode: status,
      error: 'ValidationError',
      message,
      requestId: (request as any).id || request.headers['x-request-id'] as string,
      details: validationErrors.length > 0 ? validationErrors : undefined,
    };

    // Log de validação
    this.logger.warn(`Validation Error on ${request.method} ${request.url}`, {
      path: request.url,
      method: request.method,
      statusCode: status,
      validationErrors,
      requestId: errorResponse.requestId,
    });

    response.status(status).json(errorResponse);
  }

  /**
   * Parseia as mensagens de validação do class-validator
   */
  private parseValidationErrors(messages: any[]): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const msg of messages) {
      if (typeof msg === 'string') {
        // Mensagem simples
        errors.push({
          field: 'unknown',
          constraints: [msg],
        });
      } else if (msg.property && msg.constraints) {
        // Formato do class-validator
        errors.push({
          field: msg.property,
          value: msg.value,
          constraints: Object.values(msg.constraints),
        });
      }
    }

    return errors;
  }
}
