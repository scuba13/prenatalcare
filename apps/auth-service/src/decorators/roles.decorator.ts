import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

export const ROLES_KEY = 'roles';

/**
 * Decorator para definir roles permitidas em uma rota
 *
 * @example
 * @Roles(UserRole.ADMIN, UserRole.MEDICO)
 * @Get('protected')
 * getProtected() {}
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
