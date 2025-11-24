import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

/**
 * DTO de resposta de usuário (sem senha)
 */
export class UserResponseDto {
  @ApiProperty({ description: 'ID do usuário' })
  id: string;

  @ApiProperty({ description: 'Email do usuário' })
  email: string;

  @ApiProperty({ description: 'Nome do usuário' })
  name: string;

  @ApiProperty({ description: 'Role do usuário', enum: UserRole })
  role: UserRole;

  @ApiProperty({ description: 'ID do cidadão (gestantes)', required: false })
  citizenId?: string;

  @ApiProperty({ description: 'ID do médico (médicos)', required: false })
  doctorId?: string;

  @ApiProperty({ description: 'Se o email foi verificado' })
  isEmailVerified: boolean;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;
}

/**
 * DTO de resposta de autenticação
 */
export class AuthResponseDto {
  @ApiProperty({ description: 'Access token JWT' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh token JWT' })
  refreshToken: string;

  @ApiProperty({ description: 'Tipo do token', default: 'Bearer' })
  tokenType: string;

  @ApiProperty({ description: 'Tempo de expiração em segundos' })
  expiresIn: number;

  @ApiProperty({ description: 'Dados do usuário', type: UserResponseDto })
  user: UserResponseDto;
}

/**
 * DTO de resposta de refresh
 */
export class RefreshResponseDto {
  @ApiProperty({ description: 'Novo access token JWT' })
  accessToken: string;

  @ApiProperty({ description: 'Tipo do token', default: 'Bearer' })
  tokenType: string;

  @ApiProperty({ description: 'Tempo de expiração em segundos' })
  expiresIn: number;
}
