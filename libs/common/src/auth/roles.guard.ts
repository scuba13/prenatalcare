import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, UserRole } from './roles.decorator';

/**
 * Guard de autorização baseado em roles compartilhado
 *
 * Verifica se o usuário possui uma das roles permitidas.
 * Usar em conjunto com @Roles() decorator.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obter roles permitidas do metadata
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Se não há roles definidas, permitir acesso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Obter usuário do request
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // Verificar se usuário tem uma das roles permitidas
    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Acesso negado. Roles permitidas: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
