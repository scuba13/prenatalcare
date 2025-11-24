import { Module, DynamicModule } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

export interface AuthModuleOptions {
  jwtSecret?: string;
  jwtExpiresIn?: string | number;
}

/**
 * Módulo de autenticação compartilhado
 *
 * Este módulo configura Passport JWT para validar tokens em todos os serviços.
 * Deve ser importado em cada serviço que precisa validar tokens JWT.
 */
@Module({})
export class AuthModule {
  /**
   * Registra o módulo com configuração via ConfigService
   */
  static forRoot(): DynamicModule {
    return {
      module: AuthModule,
      global: true,
      imports: [
        ConfigModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            secret: configService.get('JWT_SECRET', 'your-default-secret'),
            signOptions: {
              expiresIn: configService.get('JWT_ACCESS_EXPIRATION', '15m'),
            },
          }),
        }),
      ],
      providers: [
        Reflector,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        },
        {
          provide: APP_GUARD,
          useClass: RolesGuard,
        },
      ],
      exports: [Reflector, JwtStrategy, JwtAuthGuard, RolesGuard, PassportModule, JwtModule],
    };
  }

  /**
   * Registra o módulo com configuração estática
   */
  static forRootWithOptions(options: AuthModuleOptions): DynamicModule {
    return {
      module: AuthModule,
      global: true,
      imports: [
        ConfigModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: options.jwtSecret || 'your-default-secret',
          signOptions: {
            expiresIn: (options.jwtExpiresIn || '15m') as any,
          },
        }),
      ],
      providers: [
        Reflector,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        },
        {
          provide: APP_GUARD,
          useClass: RolesGuard,
        },
      ],
      exports: [Reflector, JwtStrategy, JwtAuthGuard, RolesGuard, PassportModule, JwtModule],
    };
  }
}
