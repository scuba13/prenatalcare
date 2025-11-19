import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PregnanciesService } from './pregnancies.service';
import { CreatePregnancyDto } from './dto/create-pregnancy.dto';
import { UpdatePregnancyDto } from './dto/update-pregnancy.dto';
import { CompletePregnancyDto } from './dto/complete-pregnancy.dto';

@ApiTags('Pregnancies')
@Controller('pregnancies')
export class PregnanciesController {
  constructor(private readonly pregnanciesService: PregnanciesService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova gestação' })
  @ApiResponse({ status: 201, description: 'Gestação criada com sucesso' })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  @ApiResponse({ status: 409, description: 'Cidadão já possui gestação ativa' })
  create(@Body() createPregnancyDto: CreatePregnancyDto) {
    return this.pregnanciesService.create({
      ...createPregnancyDto,
      lastMenstrualPeriod: new Date(createPregnancyDto.lastMenstrualPeriod),
    });
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as gestações' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'completed', 'terminated'], description: 'Filtrar por status' })
  @ApiResponse({ status: 200, description: 'Lista de gestações' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: 'active' | 'completed' | 'terminated',
  ) {
    const parsedPage = page ? parseInt(page.toString(), 10) : 1;
    const parsedLimit = limit ? parseInt(limit.toString(), 10) : 20;
    return this.pregnanciesService.findAll(parsedPage, parsedLimit, status);
  }

  @Get('active')
  @ApiOperation({ summary: 'Listar gestações ativas' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Gestações ativas' })
  findActive(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.pregnanciesService.findAll(page, limit, 'active');
  }

  @Get('high-risk')
  @ApiOperation({ summary: 'Listar gestações de alto risco' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Gestações de alto risco' })
  findHighRisk(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.pregnanciesService.findByRiskLevel('alto', page, limit);
  }

  @Get('citizen/:citizenId')
  @ApiOperation({ summary: 'Buscar gestações de um cidadão' })
  @ApiParam({ name: 'citizenId', description: 'UUID do cidadão' })
  @ApiResponse({ status: 200, description: 'Gestações do cidadão' })
  findByCitizen(@Param('citizenId') citizenId: string) {
    return this.pregnanciesService.findByCitizen(citizenId);
  }

  @Get('citizen/:citizenId/active')
  @ApiOperation({ summary: 'Buscar gestação ativa de um cidadão' })
  @ApiParam({ name: 'citizenId', description: 'UUID do cidadão' })
  @ApiResponse({ status: 200, description: 'Gestação ativa' })
  @ApiResponse({ status: 404, description: 'Nenhuma gestação ativa encontrada' })
  findActiveByCitizen(@Param('citizenId') citizenId: string) {
    return this.pregnanciesService.findActiveByCitizen(citizenId);
  }

  @Get('due-soon')
  @ApiOperation({ summary: 'Gestações com vencimento próximo' })
  @ApiQuery({ name: 'days', required: false, type: Number, example: 30 })
  @ApiResponse({ status: 200, description: 'Gestações próximas do vencimento' })
  findDueSoon(@Query('days') days?: number) {
    return this.pregnanciesService.findDueSoon(days);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Estatísticas de gestações' })
  @ApiResponse({ status: 200, description: 'Estatísticas' })
  async getStatistics() {
    const [total, active, completed, terminated] = await Promise.all([
      this.pregnanciesService.findAll(1, 1).then(r => r.total),
      this.pregnanciesService.findAll(1, 1, 'active').then(r => r.total),
      this.pregnanciesService.findAll(1, 1, 'completed').then(r => r.total),
      this.pregnanciesService.findAll(1, 1, 'terminated').then(r => r.total),
    ]);
    return { total, active, completed, terminated };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar gestação por ID' })
  @ApiParam({ name: 'id', description: 'UUID da gestação' })
  @ApiResponse({ status: 200, description: 'Gestação encontrada' })
  @ApiResponse({ status: 404, description: 'Gestação não encontrada' })
  findOne(@Param('id') id: string) {
    return this.pregnanciesService.findById(id, true);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar gestação' })
  @ApiParam({ name: 'id', description: 'UUID da gestação' })
  @ApiResponse({ status: 200, description: 'Gestação atualizada' })
  @ApiResponse({ status: 404, description: 'Gestação não encontrada' })
  update(@Param('id') id: string, @Body() updatePregnancyDto: UpdatePregnancyDto) {
    const updateData: any = { ...updatePregnancyDto };
    if (updatePregnancyDto.lastMenstrualPeriod) {
      updateData.lastMenstrualPeriod = new Date(updatePregnancyDto.lastMenstrualPeriod);
    }
    return this.pregnanciesService.update(id, updateData);
  }

  @Post(':id/risk-factors')
  @ApiOperation({ summary: 'Adicionar fator de risco' })
  @ApiParam({ name: 'id', description: 'UUID da gestação' })
  @ApiResponse({ status: 200, description: 'Fator de risco adicionado' })
  addRiskFactor(
    @Param('id') id: string,
    @Body() riskFactor: {
      code: string;
      display: string;
      severity?: 'low' | 'moderate' | 'high';
    }
  ) {
    return this.pregnanciesService.addRiskFactor(id, riskFactor);
  }

  @Delete(':id/risk-factors/:code')
  @ApiOperation({ summary: 'Remover fator de risco' })
  @ApiParam({ name: 'id', description: 'UUID da gestação' })
  @ApiParam({ name: 'code', description: 'Código do fator de risco' })
  @ApiResponse({ status: 200, description: 'Fator de risco removido' })
  removeRiskFactor(
    @Param('id') id: string,
    @Param('code') code: string,
  ) {
    return this.pregnanciesService.removeRiskFactor(id, code);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Finalizar gestação (parto/término)' })
  @ApiParam({ name: 'id', description: 'UUID da gestação' })
  @ApiResponse({ status: 200, description: 'Gestação finalizada' })
  @ApiResponse({ status: 404, description: 'Gestação não encontrada' })
  complete(@Param('id') id: string, @Body() completePregnancyDto: CompletePregnancyDto) {
    return this.pregnanciesService.complete(id, {
      outcomeDate: new Date(completePregnancyDto.deliveryDate),
      deliveryMethod: completePregnancyDto.deliveryType as any,
      outcomeNotes: completePregnancyDto.notes,
    });
  }

  @Post(':id/terminate')
  @ApiOperation({ summary: 'Encerrar gestação (aborto/perda)' })
  @ApiParam({ name: 'id', description: 'UUID da gestação' })
  @ApiResponse({ status: 200, description: 'Gestação encerrada' })
  terminate(
    @Param('id') id: string,
    @Body() data: { date?: string; notes: string },
  ) {
    return this.pregnanciesService.terminate(id, {
      outcomeDate: data.date ? new Date(data.date) : new Date(),
      outcomeNotes: data.notes,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar gestação (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID da gestação' })
  @ApiResponse({ status: 204, description: 'Gestação deletada' })
  @ApiResponse({ status: 404, description: 'Gestação não encontrada' })
  remove(@Param('id') id: string) {
    return this.pregnanciesService.softDelete(id);
  }
}
