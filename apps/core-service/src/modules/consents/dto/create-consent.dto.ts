import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class CreateConsentDto {
  @ApiProperty({ description: 'UUID do cidadão', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  citizenId: string;

  @ApiProperty({
    description: 'Finalidade do consentimento',
    enum: [
      'data_collection',
      'data_processing',
      'data_sharing',
      'marketing',
      'research',
      'third_party_sharing',
      'anonymized_statistics',
      'health_records_access'
    ],
    example: 'data_collection'
  })
  @IsEnum([
    'data_collection',
    'data_processing',
    'data_sharing',
    'marketing',
    'research',
    'third_party_sharing',
    'anonymized_statistics',
    'health_records_access'
  ])
  purpose:
    | 'data_collection'
    | 'data_processing'
    | 'data_sharing'
    | 'marketing'
    | 'research'
    | 'third_party_sharing'
    | 'anonymized_statistics'
    | 'health_records_access';

  @ApiProperty({ description: 'Consentimento concedido', example: true })
  @IsBoolean()
  granted: boolean;

  @ApiPropertyOptional({ description: 'Endereço IP do usuário', example: '192.168.1.1' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User Agent do navegador' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({ description: 'Versão dos termos aceitos', example: '1.0.0' })
  @IsString()
  @IsNotEmpty()
  termsVersion: string;

  @ApiPropertyOptional({ description: 'Data de expiração do consentimento', example: '2026-11-18' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
