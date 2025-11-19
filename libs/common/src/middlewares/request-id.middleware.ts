import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware para adicionar requestId único em cada requisição
 * Permite rastreamento de requisições através de logs
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Usa o requestId do header se existir, senão gera um novo
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();

    // Adiciona no request para uso posterior
    (req as any).id = requestId;

    // Adiciona no response header
    res.setHeader('x-request-id', requestId);

    next();
  }
}
