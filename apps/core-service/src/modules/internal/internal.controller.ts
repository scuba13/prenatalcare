import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Public } from '@prenatal/common';
import { PregnanciesService } from '../pregnancies/pregnancies.service';
import { TasksService } from '../tasks/tasks.service';

/**
 * Controller interno para comunicação serviço-a-serviço
 * Sem autenticação JWT - usar apenas para chamadas internas entre microsserviços
 *
 * IMPORTANTE: Esses endpoints devem estar protegidos por firewall/rede interna
 */
@ApiTags('Internal')
@Public()
@Controller('internal')
export class InternalController {
  private readonly logger = new Logger(InternalController.name);

  constructor(
    private readonly pregnanciesService: PregnanciesService,
    private readonly tasksService: TasksService,
  ) {}

  /**
   * Endpoint interno para RNDS Service buscar gestações ativas
   */
  @Get('pregnancies')
  @ApiOperation({ summary: '[Internal] Listar gestações para sync' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista de gestações' })
  async getPregnancies(
    @Query('status') status?: 'active' | 'completed' | 'terminated',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    this.logger.debug(`[Internal] Fetching pregnancies: status=${status}, page=${page}, limit=${limit}`);
    const parsedPage = page ? parseInt(page.toString(), 10) : 1;
    const parsedLimit = limit ? parseInt(limit.toString(), 10) : 1000;
    return this.pregnanciesService.findAll(parsedPage, parsedLimit, status);
  }

  /**
   * Endpoint interno para Notification Service buscar tasks com vencimento próximo
   */
  @Get('tasks/due-soon')
  @ApiOperation({ summary: '[Internal] Buscar tarefas com vencimento próximo' })
  @ApiQuery({ name: 'days', required: false, type: Number, example: 7 })
  @ApiResponse({ status: 200, description: 'Tarefas com vencimento próximo' })
  async getTasksDueSoon(@Query('days') days?: number) {
    const parsedDays = days ? parseInt(days.toString(), 10) : 7;
    this.logger.debug(`[Internal] Fetching tasks due soon: days=${parsedDays}`);
    return this.tasksService.findDueSoon(parsedDays);
  }
}
