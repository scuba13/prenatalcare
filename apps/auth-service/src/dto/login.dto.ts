import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * DTO para login de usuário
 */
export class LoginDto {
  @ApiProperty({
    description: 'Email do usuário',
    example: 'maria@email.com',
  })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'Senha@123',
  })
  @IsString()
  @MinLength(1, { message: 'Senha é obrigatória' })
  password: string;
}
