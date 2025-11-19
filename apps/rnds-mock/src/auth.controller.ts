import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('oauth2')
export class AuthController {
  @Post('token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter access token (mock)' })
  @ApiResponse({ status: 200, description: 'Token de acesso gerado' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async getToken(@Body() body: any) {
    // Simular autenticação bem-sucedida
    // Em produção, validaria client_id, client_secret, grant_type

    if (body.grant_type !== 'client_credentials') {
      return {
        error: 'unsupported_grant_type',
        error_description: 'Only client_credentials grant type is supported',
      };
    }

    // Gerar token fake (JWT-like)
    const fakeToken = Buffer.from(
      JSON.stringify({
        sub: 'mock-client',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hora
      })
    ).toString('base64');

    return {
      access_token: `mock_${fakeToken}`,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'read write',
    };
  }
}
