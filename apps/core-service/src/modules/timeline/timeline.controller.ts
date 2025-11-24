import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '@prenatal/common';
import { TimelineService } from './timeline.service';

@ApiTags('Timeline')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('timeline')
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  @Get('citizen/:citizenId')
  @ApiOperation({ summary: 'Obter timeline completa de um cidadão' })
  @ApiParam({ name: 'citizenId', description: 'UUID do cidadão' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Data inicial (ISO 8601)', example: '2025-01-01' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Data final (ISO 8601)', example: '2025-12-31' })
  @ApiQuery({
    name: 'types',
    required: false,
    description: 'Tipos de eventos (separados por vírgula)',
    example: 'pregnancy,task,care_plan',
    enum: ['citizen', 'pregnancy', 'task', 'care_plan', 'consent']
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Número máximo de eventos', example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Timeline do cidadão',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['citizen', 'pregnancy', 'task', 'care_plan', 'consent'] },
          action: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          description: { type: 'string' },
          entityId: { type: 'string' },
          metadata: { type: 'object' },
        }
      }
    }
  })
  async getCitizenTimeline(
    @Param('citizenId') citizenId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('types') types?: string,
    @Query('limit') limit?: number,
  ) {
    const options: any = {};

    if (startDate) {
      options.startDate = new Date(startDate);
    }
    if (endDate) {
      options.endDate = new Date(endDate);
    }
    if (types) {
      options.types = types.split(',');
    }
    if (limit) {
      options.limit = parseInt(limit.toString(), 10);
    }

    return this.timelineService.getCitizenTimeline(citizenId, options);
  }

  @Get('pregnancy/:pregnancyId')
  @ApiOperation({ summary: 'Obter timeline de uma gestação específica' })
  @ApiParam({ name: 'pregnancyId', description: 'UUID da gestação' })
  @ApiResponse({
    status: 200,
    description: 'Timeline da gestação',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          action: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          description: { type: 'string' },
          entityId: { type: 'string' },
          metadata: { type: 'object' },
        }
      }
    }
  })
  getPregnancyTimeline(@Param('pregnancyId') pregnancyId: string) {
    return this.timelineService.getPregnancyTimeline(pregnancyId);
  }

  @Get('citizen/:citizenId/stats')
  @ApiOperation({ summary: 'Obter estatísticas da timeline de um cidadão' })
  @ApiParam({ name: 'citizenId', description: 'UUID do cidadão' })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas da timeline',
    schema: {
      type: 'object',
      properties: {
        totalEvents: { type: 'number' },
        byType: {
          type: 'object',
          additionalProperties: { type: 'number' }
        },
        byAction: {
          type: 'object',
          additionalProperties: { type: 'number' }
        },
        firstEvent: { type: 'object' },
        lastEvent: { type: 'object' },
      }
    }
  })
  getTimelineStats(@Param('citizenId') citizenId: string) {
    return this.timelineService.getTimelineStats(citizenId);
  }
}
