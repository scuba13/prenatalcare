import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { SchedulingService } from '../services/scheduling.service';
import { CreateAppointmentDto } from '../adapters/dtos/create-appointment.dto';
import { UpdateAppointmentDto } from '../adapters/dtos/update-appointment.dto';
import { AvailabilityFiltersDto } from '../adapters/dtos/availability-filters.dto';
import { Appointment } from '../entities/appointment.entity';
import { AvailableSlot } from '../adapters/types/appointment-result.type';

/**
 * Controller responsável pelos endpoints de agendamento.
 *
 * Endpoints:
 * - POST /scheduling/appointments - Cria novo agendamento
 * - GET /scheduling/appointments/:id - Busca agendamento por ID
 * - PUT /scheduling/appointments/:id - Atualiza agendamento
 * - DELETE /scheduling/appointments/:id - Cancela agendamento
 * - GET /scheduling/appointments/patient/:patientId - Lista agendamentos do paciente
 * - GET /scheduling/availability - Verifica disponibilidade de horários
 */
@ApiTags('Scheduling')
@Controller('scheduling')
export class SchedulingController {
  private readonly logger = new Logger(SchedulingController.name);

  constructor(private readonly schedulingService: SchedulingService) {}

  /**
   * Cria um novo agendamento
   */
  @Post('appointments')
  @ApiOperation({
    summary: 'Criar novo agendamento',
    description:
      'Cria um novo agendamento no sistema externo e persiste localmente',
  })
  @ApiBody({ type: CreateAppointmentDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Agendamento criado com sucesso',
    type: Appointment,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Circuit breaker aberto - serviço temporariamente indisponível',
  })
  @HttpCode(HttpStatus.CREATED)
  async createAppointment(
    @Body() dto: CreateAppointmentDto,
  ): Promise<Appointment> {
    this.logger.log(`POST /scheduling/appointments - patient: ${dto.patientId}`);
    return this.schedulingService.createAppointment(dto);
  }

  /**
   * Busca um agendamento por ID
   */
  @Get('appointments/:id')
  @ApiOperation({
    summary: 'Buscar agendamento por ID',
    description: 'Retorna os detalhes de um agendamento específico',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do agendamento',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Agendamento encontrado',
    type: Appointment,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Agendamento não encontrado',
  })
  async getAppointment(@Param('id') id: string): Promise<Appointment> {
    this.logger.log(`GET /scheduling/appointments/${id}`);
    return this.schedulingService.getAppointment(id);
  }

  /**
   * Atualiza um agendamento existente
   */
  @Put('appointments/:id')
  @ApiOperation({
    summary: 'Atualizar agendamento',
    description: 'Atualiza um agendamento existente no sistema externo e localmente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do agendamento',
    type: String,
  })
  @ApiBody({ type: UpdateAppointmentDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Agendamento atualizado com sucesso',
    type: Appointment,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Agendamento não encontrado',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Circuit breaker aberto - serviço temporariamente indisponível',
  })
  async updateAppointment(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ): Promise<Appointment> {
    this.logger.log(`PUT /scheduling/appointments/${id}`);
    return this.schedulingService.updateAppointment(id, dto);
  }

  /**
   * Cancela um agendamento
   */
  @Delete('appointments/:id')
  @ApiOperation({
    summary: 'Cancelar agendamento',
    description: 'Cancela um agendamento no sistema externo e atualiza status localmente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do agendamento',
    type: String,
  })
  @ApiQuery({
    name: 'reason',
    description: 'Motivo do cancelamento',
    required: false,
    type: String,
    example: 'Paciente não compareceu',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Agendamento cancelado com sucesso',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Agendamento não encontrado',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Circuit breaker aberto - serviço temporariamente indisponível',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelAppointment(
    @Param('id') id: string,
    @Query('reason') reason?: string,
  ): Promise<void> {
    this.logger.log(`DELETE /scheduling/appointments/${id} - reason: ${reason}`);
    await this.schedulingService.cancelAppointment(id, reason);
  }

  /**
   * Lista agendamentos de um paciente
   */
  @Get('appointments/patient/:patientId')
  @ApiOperation({
    summary: 'Listar agendamentos do paciente',
    description: 'Retorna todos os agendamentos de um paciente ordenados por data',
  })
  @ApiParam({
    name: 'patientId',
    description: 'ID do paciente',
    type: String,
    example: 'patient-123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de agendamentos',
    type: [Appointment],
  })
  async getAppointmentsByPatient(
    @Param('patientId') patientId: string,
  ): Promise<Appointment[]> {
    this.logger.log(`GET /scheduling/appointments/patient/${patientId}`);
    return this.schedulingService.getAppointmentsByPatient(patientId);
  }

  /**
   * Verifica disponibilidade de horários
   */
  @Get('availability')
  @ApiOperation({
    summary: 'Verificar disponibilidade',
    description: 'Consulta horários disponíveis no sistema externo com base nos filtros',
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Data inicial (YYYY-MM-DD)',
    required: true,
    type: String,
    example: '2025-11-20',
  })
  @ApiQuery({
    name: 'endDate',
    description: 'Data final (YYYY-MM-DD)',
    required: false,
    type: String,
    example: '2025-11-22',
  })
  @ApiQuery({
    name: 'professionalId',
    description: 'ID do profissional',
    required: false,
    type: String,
    example: 'doctor-456',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de horários disponíveis',
    type: [Object], // AvailableSlot não é uma classe, é uma interface
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Filtros inválidos',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Circuit breaker aberto - serviço temporariamente indisponível',
  })
  async checkAvailability(
    @Query() filters: AvailabilityFiltersDto,
  ): Promise<AvailableSlot[]> {
    this.logger.log(
      `GET /scheduling/availability - startDate: ${filters.startDate}`,
    );
    return this.schedulingService.checkAvailability(filters);
  }
}
