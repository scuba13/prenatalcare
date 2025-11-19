import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLoggerService } from '../logger/logger.service';
import { ErrorResponse } from '../interfaces/error-response.interface';

/**
 * Filter para capturar HttpException
 * Formata a resposta de erro de forma padronizada
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('HttpExceptionFilter');
  }

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Extrai a mensagem do erro
    let message: string | string[];
    let error: string;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as any;
      message = responseObj.message || exception.message;
      error = responseObj.error || exception.name;
    } else {
      message = exception.message;
      error = exception.name;
    }

    const errorResponse: ErrorResponse = {
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      statusCode: status,
      error,
      message,
      requestId: (request as any).id || request.headers['x-request-id'] as string,
    };

    // Adiciona stack trace apenas em desenvolvimento
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.stack = exception.stack;
    }

    // Log do erro
    this.logger.error(
      `HTTP ${status} Error: ${error}`,
      exception.stack,
      {
        path: request.url,
        method: request.method,
        statusCode: status,
        message,
        requestId: errorResponse.requestId,
      },
    );

    response.status(status).json(errorResponse);
  }
}
