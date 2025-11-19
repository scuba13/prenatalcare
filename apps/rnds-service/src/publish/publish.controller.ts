import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { PublishService } from './publish.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublishLog } from '../entities/publish-log.entity';

@Controller('publish')
@ApiTags('Publication')
export class PublishController {
  constructor(
    private readonly publishService: PublishService,
    @InjectRepository(PublishLog)
    private readonly publishLogRepository: Repository<PublishLog>,
  ) {}

  @Post('citizen')
  @ApiOperation({ summary: 'Publicar dados de cidadã (Patient) na RNDS' })
  @ApiBody({
    description: 'Dados da cidadã no formato do domínio',
    schema: {
      type: 'object',
      required: ['cpf', 'fullName', 'birthDate', 'gender'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        cpf: { type: 'string', example: '12345678900' },
        cns: { type: 'string', example: '123456789012345' },
        fullName: { type: 'string', example: 'Maria Silva Santos' },
        familyName: { type: 'string', example: 'Silva Santos' },
        givenNames: { type: 'array', items: { type: 'string' }, example: ['Maria'] },
        birthDate: { type: 'string', format: 'date', example: '1990-05-15' },
        gender: { type: 'string', enum: ['female', 'male', 'other', 'unknown'] },
        phone: { type: 'string', example: '11987654321' },
        email: { type: 'string', example: 'maria@email.com' },
      },
    },
  })
  async publishCitizen(@Body() citizenData: any) {
    return this.publishService.publishCitizen(citizenData);
  }

  @Post('pregnancy')
  @ApiOperation({
    summary: 'Publicar gravidez (Condition + CarePlan) como bundle transacional',
  })
  @ApiBody({
    description: 'Dados da gravidez no formato do domínio',
    schema: {
      type: 'object',
      required: ['citizenId', 'status', 'estimatedDueDate'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        citizenId: { type: 'string', format: 'uuid' },
        status: {
          type: 'string',
          enum: ['active', 'resolved', 'inactive'],
          example: 'active',
        },
        estimatedDueDate: { type: 'string', format: 'date', example: '2024-12-15' },
        lastMenstrualPeriod: { type: 'string', format: 'date', example: '2024-03-08' },
        gestationalWeeks: { type: 'number', example: 20 },
        riskLevel: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          example: 'low',
        },
        notes: { type: 'string', example: 'Gestação sem intercorrências' },
      },
    },
  })
  async publishPregnancy(@Body() pregnancyData: any) {
    return this.publishService.publishPregnancy(pregnancyData);
  }

  @Post('observations')
  @ApiOperation({
    summary: 'Publicar observações clínicas (batch ou transacional)',
  })
  @ApiBody({
    description: 'Array de observações clínicas e opção de usar transação',
    schema: {
      type: 'object',
      required: ['observations'],
      properties: {
        observations: {
          type: 'array',
          items: {
            type: 'object',
            required: ['citizenId', 'code', 'value', 'effectiveDateTime'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              citizenId: { type: 'string', format: 'uuid' },
              pregnancyId: { type: 'string', format: 'uuid' },
              category: {
                type: 'string',
                enum: ['vital-signs', 'laboratory', 'imaging', 'procedure', 'exam'],
                example: 'vital-signs',
              },
              code: { type: 'string', example: '8480-6' },
              codeSystem: { type: 'string', example: 'http://loinc.org' },
              displayText: { type: 'string', example: 'Systolic blood pressure' },
              value: { type: 'number', example: 120 },
              unit: { type: 'string', example: 'mm[Hg]' },
              effectiveDateTime: {
                type: 'string',
                format: 'date-time',
                example: '2024-03-20T10:30:00Z',
              },
            },
          },
        },
        useTransaction: {
          type: 'boolean',
          default: false,
          description: 'Se true, usa bundle transacional; se false, usa batch',
        },
      },
    },
  })
  async publishObservations(
    @Body() body: { observations: any[]; useTransaction?: boolean },
  ) {
    return this.publishService.publishObservations(
      body.observations,
      body.useTransaction || false,
    );
  }

  @Post('retry/:publishLogId')
  @ApiOperation({
    summary: 'Tentar novamente publicação falhada usando idempotencyKey',
  })
  @ApiParam({
    name: 'publishLogId',
    description: 'ID do registro de PublishLog a ser retentado',
  })
  async retryPublish(
    @Param('publishLogId', ParseUUIDPipe) publishLogId: string,
  ) {
    return this.publishService.retryPublish(publishLogId);
  }

  @Get('validation-report/:bundleId')
  @ApiOperation({
    summary: 'Obter relatório de validação de um bundle publicado',
  })
  @ApiParam({
    name: 'bundleId',
    description: 'ID do bundle (pode ser bundleId ou publishLogId)',
  })
  @ApiResponse({
    status: 200,
    description: 'Relatório de validação do bundle',
    schema: {
      type: 'object',
      properties: {
        bundleId: { type: 'string' },
        publishLog: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            operation: { type: 'string' },
            status: { type: 'string' },
            resourceType: { type: 'string' },
            resourceCount: { type: 'number' },
            successCount: { type: 'number' },
            failureCount: { type: 'number' },
            responseTime: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        request: { type: 'object' },
        response: { type: 'object' },
        validationIssues: {
          type: 'array',
          items: { type: 'object' },
        },
        errorDetails: {
          type: 'object',
          properties: {
            errorMessage: { type: 'string' },
            errorCode: { type: 'string' },
          },
        },
      },
    },
  })
  async getValidationReport(@Param('bundleId') bundleId: string) {
    // Tentar buscar por bundleId primeiro
    let publishLog = await this.publishLogRepository.findOne({
      where: { bundleId },
    });

    // Se não encontrar, tentar buscar por publishLogId (UUID)
    if (!publishLog) {
      publishLog = await this.publishLogRepository.findOne({
        where: { id: bundleId },
      });
    }

    if (!publishLog) {
      throw new NotFoundException(
        `Nenhum log de publicação encontrado para bundleId/publishLogId: ${bundleId}`,
      );
    }

    return {
      bundleId: publishLog.bundleId,
      publishLog: {
        id: publishLog.id,
        operation: publishLog.operation,
        status: publishLog.status,
        resourceType: publishLog.resourceType,
        resourceCount: publishLog.resourceCount,
        successCount: publishLog.successCount,
        failureCount: publishLog.failureCount,
        responseTime: publishLog.responseTime,
        createdAt: publishLog.createdAt,
      },
      request: publishLog.request,
      response: publishLog.response,
      validationIssues: publishLog.validationIssues || [],
      errorDetails: publishLog.errorMessage
        ? {
            errorMessage: publishLog.errorMessage,
            errorCode: publishLog.errorCode,
          }
        : null,
    };
  }
}
