import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AppLoggerService } from './logger.service';

/**
 * Interceptor para logar requisições HTTP
 * Captura método, URL, status, duração e contexto
 */
@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const requestId = headers['x-request-id'] || request.id;

    const startTime = Date.now();

    // Log da entrada da requisição
    this.logger.http(`→ ${method} ${url}`, {
      method,
      url,
      ip,
      userAgent,
      requestId,
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const duration = Date.now() - startTime;

          // Log da saída da requisição
          this.logger.http(`← ${method} ${url} ${statusCode}`, {
            method,
            url,
            statusCode,
            duration,
            requestId,
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          // Log de erro
          this.logger.error(`✗ ${method} ${url} ${statusCode}`, error.stack, {
            method,
            url,
            statusCode,
            duration,
            requestId,
            errorMessage: error.message,
          });
        },
      }),
    );
  }
}
