import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@prenatal/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova tarefa' })
  @ApiResponse({ status: 201, description: 'Tarefa criada com sucesso' })
  @ApiResponse({ status: 404, description: 'Gestação não encontrada' })
  create(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create({
      ...createTaskDto,
      dueDate: new Date(createTaskDto.dueDate),
    });
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as tarefas' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'in-progress', 'completed', 'cancelled', 'overdue'] })
  @ApiResponse({ status: 200, description: 'Lista de tarefas' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.tasksService.findAll(page, limit, status);
  }

  @Get('pregnancy/:pregnancyId')
  @ApiOperation({ summary: 'Buscar tarefas de uma gestação' })
  @ApiParam({ name: 'pregnancyId', description: 'UUID da gestação' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'in-progress', 'completed', 'cancelled', 'overdue'] })
  @ApiResponse({ status: 200, description: 'Tarefas da gestação' })
  findByPregnancy(
    @Param('pregnancyId') pregnancyId: string,
    @Query('status') status?: string,
  ) {
    return this.tasksService.findByPregnancy(pregnancyId, status);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Buscar tarefas pendentes' })
  @ApiQuery({ name: 'pregnancyId', required: false, description: 'UUID da gestação para filtrar' })
  @ApiResponse({ status: 200, description: 'Tarefas pendentes' })
  findPending(@Query('pregnancyId') pregnancyId?: string) {
    return this.tasksService.findPending(pregnancyId);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Listar tarefas atrasadas' })
  @ApiResponse({ status: 200, description: 'Tarefas atrasadas' })
  findOverdue() {
    return this.tasksService.findOverdue();
  }

  @Get('due-soon')
  @ApiOperation({ summary: 'Listar tarefas próximas do vencimento' })
  @ApiQuery({ name: 'days', required: false, type: Number, example: 7, description: 'Número de dias à frente' })
  @ApiResponse({ status: 200, description: 'Tarefas próximas do vencimento' })
  findDueSoon(@Query('days') days?: number) {
    return this.tasksService.findDueSoon(days);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Estatísticas de tarefas' })
  @ApiResponse({ status: 200, description: 'Estatísticas' })
  getStatistics() {
    return this.tasksService.getStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar tarefa por ID' })
  @ApiParam({ name: 'id', description: 'UUID da tarefa' })
  @ApiResponse({ status: 200, description: 'Tarefa encontrada' })
  @ApiResponse({ status: 404, description: 'Tarefa não encontrada' })
  findOne(@Param('id') id: string) {
    return this.tasksService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar tarefa' })
  @ApiParam({ name: 'id', description: 'UUID da tarefa' })
  @ApiResponse({ status: 200, description: 'Tarefa atualizada' })
  @ApiResponse({ status: 404, description: 'Tarefa não encontrada' })
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    const updateData: any = { ...updateTaskDto };
    if (updateTaskDto.dueDate) {
      updateData.dueDate = new Date(updateTaskDto.dueDate);
    }
    return this.tasksService.update(id, updateData);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Marcar tarefa como concluída' })
  @ApiParam({ name: 'id', description: 'UUID da tarefa' })
  @ApiResponse({ status: 200, description: 'Tarefa concluída' })
  @ApiResponse({ status: 404, description: 'Tarefa não encontrada' })
  complete(@Param('id') id: string, @Body() completeTaskDto: CompleteTaskDto) {
    return this.tasksService.complete(id, completeTaskDto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar tarefa' })
  @ApiParam({ name: 'id', description: 'UUID da tarefa' })
  @ApiResponse({ status: 200, description: 'Tarefa cancelada' })
  @ApiResponse({ status: 404, description: 'Tarefa não encontrada' })
  cancel(@Param('id') id: string, @Body('reason') reason: string) {
    return this.tasksService.cancel(id, reason);
  }

  @Post(':id/mark-overdue')
  @ApiOperation({ summary: 'Marcar tarefa como atrasada' })
  @ApiParam({ name: 'id', description: 'UUID da tarefa' })
  @ApiResponse({ status: 200, description: 'Tarefa marcada como atrasada' })
  markOverdue(@Param('id') id: string) {
    return this.tasksService.markOverdue(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar tarefa (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID da tarefa' })
  @ApiResponse({ status: 204, description: 'Tarefa deletada' })
  @ApiResponse({ status: 404, description: 'Tarefa não encontrada' })
  remove(@Param('id') id: string) {
    return this.tasksService.softDelete(id);
  }
}
