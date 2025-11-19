import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncCursor } from '../entities/sync-cursor.entity';
import { SyncError } from '../entities/sync-error.entity';

@Controller('sync')
@ApiTags('Synchronization')
export class SyncController {
  constructor(
    private readonly syncService: SyncService,
    @InjectRepository(SyncCursor)
    private readonly syncCursorRepository: Repository<SyncCursor>,
    @InjectRepository(SyncError)
    private readonly syncErrorRepository: Repository<SyncError>,
  ) {}

  @Post('patient/:cpf')
  @ApiOperation({ summary: 'Sincronizar paciente da RNDS por CPF' })
  @ApiParam({ name: 'cpf', description: 'CPF da cidadã (apenas números)' })
  async syncPatient(@Param('cpf') cpf: string) {
    return this.syncService.syncPatient(cpf);
  }

  @Post('patient/:cpf/complete')
  @ApiOperation({
    summary: 'Sincronização completa (Patient + Conditions + Observations)',
  })
  @ApiParam({ name: 'cpf', description: 'CPF da cidadã (apenas números)' })
  async syncPatientComplete(@Param('cpf') cpf: string) {
    return this.syncService.syncPatientComplete(cpf);
  }

  @Post('conditions/:patientId')
  @ApiOperation({ summary: 'Sincronizar condições (gravidez) de uma paciente' })
  @ApiParam({ name: 'patientId', description: 'ID do Patient na RNDS' })
  async syncConditions(@Param('patientId') patientId: string) {
    return this.syncService.syncConditions(patientId);
  }

  @Post('observations/:patientId')
  @ApiOperation({ summary: 'Sincronizar observações clínicas de uma paciente' })
  @ApiParam({ name: 'patientId', description: 'ID do Patient na RNDS' })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Categoria (vital-signs, laboratory, etc.)',
  })
  async syncObservations(
    @Param('patientId') patientId: string,
    @Query('category') category?: string,
  ) {
    return this.syncService.syncObservations(patientId, category);
  }

  @Get('sync-status/:cpf')
  @ApiOperation({
    summary: 'Verificar status de sincronização de um paciente por CPF',
  })
  @ApiParam({ name: 'cpf', description: 'CPF da cidadã (apenas números)' })
  @ApiResponse({
    status: 200,
    description: 'Status de sincronização do paciente',
    schema: {
      type: 'object',
      properties: {
        cpf: { type: 'string' },
        cursors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              resourceType: { type: 'string' },
              identifier: { type: 'string' },
              lastSyncedAt: { type: 'string', format: 'date-time' },
              status: { type: 'string' },
              syncDirection: { type: 'string' },
            },
          },
        },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              operation: { type: 'string' },
              errorMessage: { type: 'string' },
              retryCount: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  async getSyncStatus(@Param('cpf') cpf: string) {
    // Buscar todos os cursores relacionados a este CPF
    const cursors = await this.syncCursorRepository.find({
      where: { identifier: cpf },
      order: { lastSyncedAt: 'DESC' },
    });

    // Buscar erros recentes relacionados a este CPF
    const errors = await this.syncErrorRepository.find({
      where: { resourceId: cpf },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      cpf,
      cursors: cursors.map((cursor) => ({
        resourceType: cursor.resourceType,
        identifier: cursor.identifier,
        lastSyncedAt: cursor.lastSyncedAt,
        status: cursor.status,
        syncDirection: cursor.syncDirection,
        versionId: cursor.versionId,
      })),
      errors: errors.map((error) => ({
        id: error.id,
        operation: error.operation,
        resourceType: error.resourceType,
        errorMessage: error.errorMessage,
        errorCode: error.errorCode,
        retryCount: error.retryCount,
        createdAt: error.createdAt,
        status: error.status,
      })),
      summary: {
        totalSyncs: cursors.length,
        lastSync: cursors[0]?.lastSyncedAt || null,
        totalErrors: errors.length,
        openErrors: errors.filter((e) => e.status === 'open').length,
      },
    };
  }
}
