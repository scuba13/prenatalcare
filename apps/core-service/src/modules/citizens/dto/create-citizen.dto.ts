import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsEnum, IsOptional, IsEmail, IsObject, Length, Matches } from 'class-validator';

export class CreateCitizenDto {
  @ApiProperty({ description: 'CPF sem formatação (apenas números)', example: '12345678901' })
  @IsString()
  @IsNotEmpty()
  @Length(11, 11)
  @Matches(/^\d{11}$/, { message: 'CPF deve conter exatamente 11 dígitos' })
  cpf: string;

  @ApiPropertyOptional({ description: 'Cartão Nacional de Saúde', example: '123456789012345' })
  @IsOptional()
  @IsString()
  @Length(15, 15)
  cns?: string;

  @ApiProperty({ description: 'Nome completo', example: 'Maria Silva Santos' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiPropertyOptional({ description: 'Sobrenome (para FHIR name.family)', example: 'Santos' })
  @IsOptional()
  @IsString()
  familyName?: string;

  @ApiPropertyOptional({ description: 'Nomes próprios (para FHIR name.given[])', example: ['Maria', 'Silva'] })
  @IsOptional()
  givenNames?: string[];

  @ApiPropertyOptional({ description: 'Nome social', example: 'Maria Santos' })
  @IsOptional()
  @IsString()
  socialName?: string;

  @ApiProperty({ description: 'Data de nascimento', example: '1990-05-15' })
  @IsDateString()
  birthDate: string;

  @ApiPropertyOptional({ description: 'Sexo (padrão: female para pré-natal)', enum: ['female', 'male', 'other', 'unknown'], example: 'female', default: 'female' })
  @IsOptional()
  @IsEnum(['female', 'male', 'other', 'unknown'])
  gender?: 'female' | 'male' | 'other' | 'unknown';

  @ApiPropertyOptional({ description: 'Nome da mãe', example: 'Ana Silva' })
  @IsOptional()
  @IsString()
  motherName?: string;

  @ApiPropertyOptional({ description: 'Nome do pai', example: 'João Santos' })
  @IsOptional()
  @IsString()
  fatherName?: string;

  @ApiProperty({ description: 'Telefone celular obrigatório (apenas números)', example: '11987654321' })
  @IsString()
  @IsNotEmpty()
  @Length(11, 11)
  @Matches(/^\d{11}$/, { message: 'Telefone celular deve conter exatamente 11 dígitos' })
  mobilePhone: string;

  @ApiPropertyOptional({ description: 'Telefone fixo (apenas números)', example: '1133334444' })
  @IsOptional()
  @IsString()
  @Length(10, 11)
  homePhone?: string;

  @ApiPropertyOptional({ description: 'E-mail', example: 'maria@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Endereço completo (conforme FHIR e BREndereco RNDS)',
    example: {
      use: 'home',
      type: 'physical',
      line: ['Rua das Flores', '123', 'Apto 45', 'Centro'],
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01234567',
      country: 'BRA'
    }
  })
  @IsOptional()
  @IsObject()
  address?: {
    use?: 'home' | 'work' | 'temp' | 'old';
    type?: 'physical' | 'postal' | 'both';
    line: [string, string, string, string]; // [street, number, complement, neighborhood]
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  };

  @ApiPropertyOptional({ description: 'Tipo sanguíneo', enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], example: 'O+' })
  @IsOptional()
  @IsEnum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

  @ApiPropertyOptional({ description: 'Lista de alergias', example: ['Penicilina', 'Látex'] })
  @IsOptional()
  allergies?: string[];

  @ApiPropertyOptional({ description: 'Condições crônicas', example: ['Diabetes', 'Hipertensão'] })
  @IsOptional()
  chronicConditions?: string[];
}
