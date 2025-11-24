import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { RefreshToken } from './refresh-token.entity';

/**
 * Enum para tipos de usuário/roles
 */
export enum UserRole {
  GESTANTE = 'gestante',
  MEDICO = 'medico',
  ADMIN = 'admin',
}

/**
 * Entidade de Usuário
 *
 * Representa um usuário do sistema com suas credenciais e perfil.
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index('idx_user_email')
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.GESTANTE,
  })
  role: UserRole;

  /**
   * ID do cidadão no Core Service (para gestantes)
   */
  @Column({ name: 'citizen_id', nullable: true })
  citizenId?: string;

  /**
   * ID do médico no Core Service (para médicos)
   */
  @Column({ name: 'doctor_id', nullable: true })
  doctorId?: string;

  /**
   * CPF do usuário (para validação)
   */
  @Column({ nullable: true, unique: true })
  @Index('idx_user_cpf')
  cpf?: string;

  /**
   * Telefone do usuário
   */
  @Column({ nullable: true })
  phone?: string;

  /**
   * Se o email foi verificado
   */
  @Column({ name: 'is_email_verified', default: false })
  isEmailVerified: boolean;

  /**
   * Se a conta está ativa
   */
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  /**
   * Último login
   */
  @Column({ name: 'last_login_at', nullable: true, type: 'timestamp' })
  lastLoginAt?: Date;

  /**
   * Número de tentativas de login falhadas
   */
  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number;

  /**
   * Conta bloqueada até (após muitas tentativas)
   */
  @Column({ name: 'locked_until', nullable: true, type: 'timestamp' })
  lockedUntil?: Date;

  /**
   * Token de recuperação de senha
   */
  @Column({ name: 'password_reset_token', nullable: true })
  passwordResetToken?: string;

  /**
   * Expiração do token de reset
   */
  @Column({ name: 'password_reset_expires', nullable: true, type: 'timestamp' })
  passwordResetExpires?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];

  /**
   * Verifica se a conta está bloqueada
   */
  isLocked(): boolean {
    if (!this.lockedUntil) return false;
    return new Date() < this.lockedUntil;
  }

  /**
   * Incrementa tentativas de login falhadas
   */
  incrementFailedAttempts(): void {
    this.failedLoginAttempts++;
    // Bloqueia após 5 tentativas por 15 minutos
    if (this.failedLoginAttempts >= 5) {
      this.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
  }

  /**
   * Reseta contador de tentativas falhadas
   */
  resetFailedAttempts(): void {
    this.failedLoginAttempts = 0;
    this.lockedUntil = null;
    this.lastLoginAt = new Date();
  }
}
