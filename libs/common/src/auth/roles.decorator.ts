import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Enum para tipos de usuário/roles compartilhado
 */
export enum UserRole {
  GESTANTE = 'gestante',
  MEDICO = 'medico',
  ADMIN = 'admin',
}

/**
 * Decorator para definir roles permitidas em uma rota
 *
 * @example
 * @Roles(UserRole.ADMIN, UserRole.MEDICO)
 * @Get('protected')
 * getProtected() {}
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
