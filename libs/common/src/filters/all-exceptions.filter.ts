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
 * Filter para capturar TODAS as exceptions
 * Trata erros não esperados e não-HTTP
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('AllExceptionsFilter');
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'InternalServerError';
    let stack: string | undefined;

    // Se for HttpException, extrai informações
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        error = responseObj.error || exception.name;
      } else {
        message = exception.message;
        error = exception.name;
      }
      stack = exception.stack;
    }
    // Se for Error nativo
    else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
      stack = exception.stack;
    }
    // Outros tipos de erro
    else if (typeof exception === 'string') {
      message = exception;
    } else {
      message = 'Unknown error occurred';
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
    if (process.env.NODE_ENV !== 'production' && stack) {
      errorResponse.stack = stack;
    }

    // Log crítico para erros 500
    if (status >= 500) {
      this.logger.error(
        `💥 CRITICAL ERROR ${status}: ${error}`,
        stack,
        {
          path: request.url,
          method: request.method,
          statusCode: status,
          message,
          requestId: errorResponse.requestId,
          exception: exception instanceof Error ? exception.constructor.name : typeof exception,
        },
      );
    } else {
      this.logger.warn(`⚠️  Client Error ${status}: ${error}`, {
        path: request.url,
        method: request.method,
        statusCode: status,
        message,
        requestId: errorResponse.requestId,
      });
    }

    response.status(status).json(errorResponse);
  }
}
