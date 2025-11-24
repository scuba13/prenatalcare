import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { User, UserRole } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import {
  AuthResponseDto,
  RefreshResponseDto,
  UserResponseDto,
} from '../dto/auth-response.dto';

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
 * Service de autenticação
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds: number;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    const saltRoundsEnv = this.configService.get<string>('BCRYPT_SALT_ROUNDS', '10');
    this.saltRounds = parseInt(saltRoundsEnv, 10);
    this.accessExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRATION',
      '15m',
    );
    this.refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRATION',
      '7d',
    );
  }

  /**
   * Registra um novo usuário
   */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    this.logger.log(`Registrando novo usuário: ${dto.email}`);

    // Verificar se email já existe
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email já cadastrado');
    }

    // Verificar se CPF já existe (se fornecido)
    if (dto.cpf) {
      const existingCpf = await this.userRepository.findOne({
        where: { cpf: dto.cpf },
      });

      if (existingCpf) {
        throw new ConflictException('CPF já cadastrado');
      }
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(dto.password, this.saltRounds);

    // Criar usuário
    const user = this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
      cpf: dto.cpf,
      phone: dto.phone,
      role: dto.role || UserRole.GESTANTE,
      citizenId: dto.citizenId,
      doctorId: dto.doctorId,
    });

    await this.userRepository.save(user);

    this.logger.log(`✅ Usuário ${user.id} registrado com sucesso`);

    // Gerar tokens
    return this.generateTokens(user);
  }

  /**
   * Realiza login do usuário
   */
  async login(
    dto: LoginDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    this.logger.log(`Tentativa de login: ${dto.email}`);

    // Buscar usuário
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Verificar se conta está bloqueada
    if (user.isLocked()) {
      throw new UnauthorizedException(
        'Conta temporariamente bloqueada. Tente novamente em 15 minutos.',
      );
    }

    // Verificar se conta está ativa
    if (!user.isActive) {
      throw new UnauthorizedException('Conta desativada');
    }

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      // Incrementar tentativas falhadas
      user.incrementFailedAttempts();
      await this.userRepository.save(user);

      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Reset tentativas falhadas e atualizar último login
    user.resetFailedAttempts();
    await this.userRepository.save(user);

    this.logger.log(`✅ Login bem-sucedido: ${user.id}`);

    // Gerar tokens
    return this.generateTokens(user, userAgent, ipAddress);
  }

  /**
   * Renova o access token usando refresh token
   */
  async refresh(refreshToken: string): Promise<RefreshResponseDto> {
    this.logger.debug('Renovando access token');

    // Buscar refresh token no banco
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
      relations: ['user'],
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    // Verificar se token é válido
    if (!storedToken.isValid()) {
      throw new UnauthorizedException('Refresh token expirado ou revogado');
    }

    // Verificar se usuário está ativo
    if (!storedToken.user.isActive) {
      throw new UnauthorizedException('Conta desativada');
    }

    // Gerar novo access token
    const payload: JwtPayload = {
      sub: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
      citizenId: storedToken.user.citizenId,
      doctorId: storedToken.user.doctorId,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.accessExpiresIn,
    });

    this.logger.debug(`✅ Access token renovado para usuário ${storedToken.userId}`);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.parseExpirationToSeconds(this.accessExpiresIn),
    };
  }

  /**
   * Realiza logout (revoga refresh tokens)
   */
  async logout(userId: string, refreshToken?: string): Promise<void> {
    this.logger.log(`Logout do usuário: ${userId}`);

    if (refreshToken) {
      // Revogar apenas o refresh token específico
      await this.refreshTokenRepository.update(
        { userId, token: refreshToken },
        { isRevoked: true },
      );
    } else {
      // Revogar todos os refresh tokens do usuário
      await this.refreshTokenRepository.update(
        { userId, isRevoked: false },
        { isRevoked: true },
      );
    }

    this.logger.log(`✅ Logout realizado para usuário ${userId}`);
  }

  /**
   * Busca usuário por ID
   */
  async findById(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
    });
  }

  /**
   * Busca usuário por email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  /**
   * Valida usuário para estratégia JWT
   */
  async validateUser(payload: JwtPayload): Promise<User | null> {
    const user = await this.findById(payload.sub);

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  }

  /**
   * Gera tokens de acesso e refresh
   */
  private async generateTokens(
    user: User,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      citizenId: user.citizenId,
      doctorId: user.doctorId,
    };

    // Gerar access token
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.accessExpiresIn,
    });

    // Gerar refresh token
    const refreshTokenValue = uuidv4();
    const refreshExpiration = this.calculateExpiration(this.refreshExpiresIn);

    // Salvar refresh token no banco
    const refreshToken = this.refreshTokenRepository.create({
      userId: user.id,
      token: refreshTokenValue,
      expiresAt: refreshExpiration,
      userAgent,
      ipAddress,
    });

    await this.refreshTokenRepository.save(refreshToken);

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      tokenType: 'Bearer',
      expiresIn: this.parseExpirationToSeconds(this.accessExpiresIn),
      user: this.toUserResponse(user),
    };
  }

  /**
   * Converte User para UserResponseDto
   */
  private toUserResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      citizenId: user.citizenId,
      doctorId: user.doctorId,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };
  }

  /**
   * Calcula data de expiração
   */
  private calculateExpiration(duration: string): Date {
    const now = new Date();
    const match = duration.match(/^(\d+)([smhd])$/);

    if (!match) {
      // Default 7 dias
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return new Date(now.getTime() + value * 1000);
      case 'm':
        return new Date(now.getTime() + value * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Converte duração para segundos
   */
  private parseExpirationToSeconds(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);

    if (!match) {
      return 900; // Default 15 minutos
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 900;
    }
  }

  /**
   * Limpa tokens expirados (para cron job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.refreshTokenRepository
      .createQueryBuilder()
      .delete()
      .where('expires_at < :now', { now: new Date() })
      .orWhere('is_revoked = :revoked', { revoked: true })
      .execute();

    return result.affected || 0;
  }
}
