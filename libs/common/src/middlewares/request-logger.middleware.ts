import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppLoggerService } from '../logger/logger.service';

/**
 * Middleware para logar informações de entrada das requisições
 * Complementa o LoggerInterceptor fornecendo logs mais detalhados
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('RequestLogger');
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || '';
    const requestId = (req as any).id || headers['x-request-id'];

    // Define contexto global para esta requisição
    AppLoggerService.setGlobalContext({
      requestId,
      method,
      url: originalUrl,
      ip,
      userAgent,
    });

    // Log de entrada
    this.logger.debug(`Incoming request: ${method} ${originalUrl}`, {
      headers: this.sanitizeHeaders(headers),
      query: req.query,
      params: req.params,
    });

    // Limpa o contexto global ao finalizar a resposta
    res.on('finish', () => {
      AppLoggerService.clearGlobalContext();
    });

    next();
  }

  /**
   * Remove headers sensíveis dos logs
   */
  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
    ];

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '***REDACTED***';
      }
    });

    return sanitized;
  }
}
