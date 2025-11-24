import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para logar informações de entrada das requisições
 * Complementa o LoggerInterceptor fornecendo logs mais detalhados
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RequestLogger');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || '';
    const requestId = (req as any).id || headers['x-request-id'];

    // Log de entrada
    this.logger.debug(
      `[${requestId}] Incoming request: ${method} ${originalUrl} from ${ip}`,
    );

    next();
  }
}
