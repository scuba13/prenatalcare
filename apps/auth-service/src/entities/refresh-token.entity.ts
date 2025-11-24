import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Entidade de Refresh Token
 *
 * Armazena tokens de refresh para renovação de access tokens.
 */
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index('idx_refresh_token_user')
  userId: string;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ unique: true })
  @Index('idx_refresh_token_token')
  token: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  /**
   * Se o token foi revogado manualmente
   */
  @Column({ name: 'is_revoked', default: false })
  isRevoked: boolean;

  /**
   * Informações do device/browser
   */
  @Column({ name: 'user_agent', nullable: true })
  userAgent?: string;

  /**
   * IP de onde o token foi gerado
   */
  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Verifica se o token expirou
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Verifica se o token é válido
   */
  isValid(): boolean {
    return !this.isRevoked && !this.isExpired();
  }
}
