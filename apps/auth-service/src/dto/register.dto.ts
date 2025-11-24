import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  Matches,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

/**
 * DTO para registro de novo usuário
 */
export class RegisterDto {
  @ApiProperty({
    description: 'Email do usuário',
    example: 'maria@email.com',
  })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({
    description: 'Senha do usuário (mínimo 8 caracteres)',
    example: 'Senha@123',
  })
  @IsString()
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  @MaxLength(50, { message: 'Senha deve ter no máximo 50 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número',
  })
  password: string;

  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'Maria da Silva',
  })
  @IsString()
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  name: string;

  @ApiPropertyOptional({
    description: 'CPF do usuário (apenas números)',
    example: '12345678901',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'CPF deve conter 11 dígitos numéricos' })
  cpf?: string;

  @ApiPropertyOptional({
    description: 'Telefone do usuário',
    example: '+5511999999999',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Tipo de usuário',
    enum: UserRole,
    default: UserRole.GESTANTE,
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Role inválido' })
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'ID do cidadão no Core Service (para gestantes)',
  })
  @IsOptional()
  @IsString()
  citizenId?: string;

  @ApiPropertyOptional({
    description: 'ID do médico no Core Service (para médicos)',
  })
  @IsOptional()
  @IsString()
  doctorId?: string;
}
