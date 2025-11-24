import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from '../services/auth.service';

/**
 * Estratégia JWT para Passport
 *
 * Valida tokens JWT e anexa usuário ao request.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
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
    const user = await this.authService.validateUser(payload);

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado ou inativo');
    }

    // Retorna objeto que será anexado ao request.user
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      citizenId: user.citizenId,
      doctorId: user.doctorId,
    };
  }
}
