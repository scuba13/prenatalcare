import { Controller, Get, Post, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ConsentsService } from './consents.service';
import { CreateConsentDto } from './dto/create-consent.dto';

@ApiTags('Consents (LGPD)')
@Controller('consents')
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar novo consentimento (LGPD)' })
  @ApiResponse({ status: 201, description: 'Consentimento registrado' })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  create(@Body() createConsentDto: CreateConsentDto) {
    return this.consentsService.grant(
      createConsentDto.citizenId,
      createConsentDto.purpose,
      {
        termsVersion: createConsentDto.termsVersion,
        ipAddress: createConsentDto.ipAddress,
        userAgent: createConsentDto.userAgent,
        expiresAt: createConsentDto.expiresAt ? new Date(createConsentDto.expiresAt) : undefined,
      },
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os consentimentos' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Lista de consentimentos' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.consentsService.findAll(page, limit);
  }

  @Get('citizen/:citizenId')
  @ApiOperation({ summary: 'Buscar consentimentos de um cidadão' })
  @ApiParam({ name: 'citizenId', description: 'UUID do cidadão' })
  @ApiResponse({ status: 200, description: 'Consentimentos do cidadão' })
  findByCitizen(@Param('citizenId') citizenId: string) {
    return this.consentsService.findByCitizen(citizenId);
  }

  @Get('citizen/:citizenId/purpose/:purpose')
  @ApiOperation({ summary: 'Verificar consentimento ativo para finalidade específica' })
  @ApiParam({ name: 'citizenId', description: 'UUID do cidadão' })
  @ApiParam({ name: 'purpose', description: 'Finalidade do consentimento' })
  @ApiResponse({ status: 200, description: 'Status do consentimento' })
  async checkConsent(
    @Param('citizenId') citizenId: string,
    @Param('purpose') purpose: string,
  ) {
    const hasConsent = await this.consentsService.hasActiveConsent(citizenId, purpose as any);
    return {
      citizenId,
      purpose,
      hasActiveConsent: hasConsent,
    };
  }

  @Get('citizen/:citizenId/purpose/:purpose/active')
  @ApiOperation({ summary: 'Buscar consentimento ativo por cidadão e finalidade' })
  @ApiParam({ name: 'citizenId', description: 'UUID do cidadão' })
  @ApiParam({ name: 'purpose', description: 'Finalidade do consentimento' })
  @ApiResponse({ status: 200, description: 'Consentimento ativo' })
  @ApiResponse({ status: 404, description: 'Nenhum consentimento ativo encontrado' })
  findActiveByPurpose(
    @Param('citizenId') citizenId: string,
    @Param('purpose') purpose: string,
  ) {
    return this.consentsService.findActiveByPurpose(citizenId, purpose as any);
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Buscar consentimentos próximos de expirar' })
  @ApiQuery({ name: 'days', required: false, type: Number, example: 30, description: 'Dias até expiração' })
  @ApiResponse({ status: 200, description: 'Consentimentos expirando' })
  findExpiring(@Query('days') days?: number) {
    return this.consentsService.findExpiring(days);
  }

  @Get('needs-renewal')
  @ApiOperation({ summary: 'Buscar consentimentos que precisam renovação' })
  @ApiResponse({ status: 200, description: 'Consentimentos para renovar' })
  findNeedingRenewal() {
    return this.consentsService.findNeedingRenewal();
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Estatísticas de consentimentos' })
  @ApiResponse({ status: 200, description: 'Estatísticas' })
  getStatistics() {
    return this.consentsService.getStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar consentimento por ID' })
  @ApiParam({ name: 'id', description: 'UUID do consentimento' })
  @ApiResponse({ status: 200, description: 'Consentimento encontrado' })
  @ApiResponse({ status: 404, description: 'Consentimento não encontrado' })
  findOne(@Param('id') id: string) {
    return this.consentsService.findById(id);
  }

  @Post(':id/revoke')
  @ApiOperation({ summary: 'Revogar consentimento (LGPD)' })
  @ApiParam({ name: 'id', description: 'UUID do consentimento' })
  @ApiResponse({ status: 200, description: 'Consentimento revogado' })
  @ApiResponse({ status: 404, description: 'Consentimento não encontrado' })
  revoke(
    @Param('id') id: string,
    @Body('reason') reason?: string,
    @Body('revokedBy') revokedBy?: string,
  ) {
    return this.consentsService.revoke(id, reason, revokedBy);
  }

  @Post(':id/renew')
  @ApiOperation({ summary: 'Renovar consentimento' })
  @ApiParam({ name: 'id', description: 'UUID do consentimento' })
  @ApiResponse({ status: 200, description: 'Consentimento renovado' })
  @ApiResponse({ status: 404, description: 'Consentimento não encontrado' })
  renew(
    @Param('id') id: string,
    @Body('grantedBy') grantedBy?: string,
  ) {
    return this.consentsService.renew(id, grantedBy);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar consentimento (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID do consentimento' })
  @ApiResponse({ status: 204, description: 'Consentimento deletado' })
  @ApiResponse({ status: 404, description: 'Consentimento não encontrado' })
  remove(@Param('id') id: string) {
    return this.consentsService.softDelete(id);
  }
}
