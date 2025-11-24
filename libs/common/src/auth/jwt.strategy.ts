import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from './roles.decorator';

/**
 * Payload do JWT
 */
export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: UserRole;
  citizenId?: string;
  doctorId?: string;
}

/**
 * Estratégia JWT compartilhada para Passport
 *
 * Valida tokens JWT e anexa usuário ao request.
 * Esta é uma classe base que pode ser estendida por cada serviço.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Valida o payload do JWT
   * Chamado automaticamente pelo Passport após verificar assinatura do token
   */
  async validate(payload: JwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException('Token inválido');
    }

    // Retorna objeto que será anexado ao request.user
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      citizenId: payload.citizenId,
      doctorId: payload.doctorId,
    };
  }
}
