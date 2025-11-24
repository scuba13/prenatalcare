import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@prenatal/common';
import { CarePlansService } from './care-plans.service';
import { CreateCarePlanDto } from './dto/create-care-plan.dto';
import { UpdateCarePlanDto } from './dto/update-care-plan.dto';

@ApiTags('Care Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('care-plans')
export class CarePlansController {
  constructor(private readonly carePlansService: CarePlansService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo plano de cuidado' })
  @ApiResponse({ status: 201, description: 'Plano criado com sucesso' })
  @ApiResponse({ status: 404, description: 'Gestação não encontrada' })
  create(@Body() createCarePlanDto: CreateCarePlanDto) {
    const data: any = { ...createCarePlanDto };
    if (createCarePlanDto.startDate) {
      data.startDate = new Date(createCarePlanDto.startDate);
    }
    if (createCarePlanDto.endDate) {
      data.endDate = new Date(createCarePlanDto.endDate);
    }
    if (createCarePlanDto.nextVisit) {
      data.nextVisit = new Date(createCarePlanDto.nextVisit);
    }
    return this.carePlansService.create(data);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os planos de cuidado' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Lista de planos' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.carePlansService.findAll(page, limit);
  }

  @Get('pregnancy/:pregnancyId')
  @ApiOperation({ summary: 'Buscar planos de uma gestação' })
  @ApiParam({ name: 'pregnancyId', description: 'UUID da gestação' })
  @ApiResponse({ status: 200, description: 'Planos da gestação' })
  findByPregnancy(@Param('pregnancyId') pregnancyId: string) {
    return this.carePlansService.findByPregnancy(pregnancyId);
  }

  @Get('pregnancy/:pregnancyId/active')
  @ApiOperation({ summary: 'Buscar plano ativo de uma gestação' })
  @ApiParam({ name: 'pregnancyId', description: 'UUID da gestação' })
  @ApiResponse({ status: 200, description: 'Plano ativo' })
  findActive(@Param('pregnancyId') pregnancyId: string) {
    return this.carePlansService.findActive(pregnancyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar plano por ID' })
  @ApiParam({ name: 'id', description: 'UUID do plano' })
  @ApiResponse({ status: 200, description: 'Plano encontrado' })
  @ApiResponse({ status: 404, description: 'Plano não encontrado' })
  findOne(@Param('id') id: string) {
    return this.carePlansService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar plano de cuidado' })
  @ApiParam({ name: 'id', description: 'UUID do plano' })
  @ApiResponse({ status: 200, description: 'Plano atualizado' })
  @ApiResponse({ status: 404, description: 'Plano não encontrado' })
  update(@Param('id') id: string, @Body() updateCarePlanDto: UpdateCarePlanDto) {
    const updateData: any = { ...updateCarePlanDto };
    if (updateCarePlanDto.startDate) {
      updateData.startDate = new Date(updateCarePlanDto.startDate);
    }
    if (updateCarePlanDto.endDate) {
      updateData.endDate = new Date(updateCarePlanDto.endDate);
    }
    if (updateCarePlanDto.nextVisit) {
      updateData.nextVisit = new Date(updateCarePlanDto.nextVisit);
    }
    return this.carePlansService.update(id, updateData);
  }

  @Post(':id/activities')
  @ApiOperation({ summary: 'Adicionar atividade ao plano' })
  @ApiParam({ name: 'id', description: 'UUID do plano' })
  @ApiResponse({ status: 200, description: 'Atividade adicionada' })
  addActivity(
    @Param('id') id: string,
    @Body() activity: {
      title: string;
      description?: string;
      status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
      scheduledDate?: Date;
    }
  ) {
    return this.carePlansService.addActivity(id, activity);
  }

  @Put(':id/activities/:activityId')
  @ApiOperation({ summary: 'Atualizar atividade do plano' })
  @ApiParam({ name: 'id', description: 'UUID do plano' })
  @ApiParam({ name: 'activityId', description: 'ID da atividade' })
  @ApiResponse({ status: 200, description: 'Atividade atualizada' })
  updateActivity(
    @Param('id') id: string,
    @Param('activityId') activityId: string,
    @Body() updates: Partial<{
      title: string;
      description?: string;
      status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
      scheduledDate?: Date;
      completedDate?: Date;
      outcome?: any;
    }>
  ) {
    return this.carePlansService.updateActivity(id, activityId, updates);
  }

  @Post(':id/activities/:activityId/complete')
  @ApiOperation({ summary: 'Marcar atividade como concluída' })
  @ApiParam({ name: 'id', description: 'UUID do plano' })
  @ApiParam({ name: 'activityId', description: 'ID da atividade' })
  @ApiResponse({ status: 200, description: 'Atividade concluída' })
  completeActivity(
    @Param('id') id: string,
    @Param('activityId') activityId: string,
  ) {
    return this.carePlansService.completeActivity(id, activityId);
  }

  @Post(':id/goals')
  @ApiOperation({ summary: 'Adicionar objetivo ao plano' })
  @ApiParam({ name: 'id', description: 'UUID do plano' })
  @ApiResponse({ status: 200, description: 'Objetivo adicionado' })
  addGoal(
    @Param('id') id: string,
    @Body() goal: {
      description: string;
      target?: string;
    }
  ) {
    return this.carePlansService.addGoal(id, goal);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Ativar plano de cuidado' })
  @ApiParam({ name: 'id', description: 'UUID do plano' })
  @ApiResponse({ status: 200, description: 'Plano ativado' })
  activate(@Param('id') id: string) {
    return this.carePlansService.activate(id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Finalizar plano de cuidado' })
  @ApiParam({ name: 'id', description: 'UUID do plano' })
  @ApiResponse({ status: 200, description: 'Plano finalizado' })
  complete(@Param('id') id: string) {
    return this.carePlansService.complete(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar plano de cuidado' })
  @ApiParam({ name: 'id', description: 'UUID do plano' })
  @ApiResponse({ status: 200, description: 'Plano cancelado' })
  cancel(@Param('id') id: string) {
    return this.carePlansService.cancel(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar plano (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID do plano' })
  @ApiResponse({ status: 204, description: 'Plano deletado' })
  @ApiResponse({ status: 404, description: 'Plano não encontrado' })
  remove(@Param('id') id: string) {
    return this.carePlansService.softDelete(id);
  }
}
