import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '@prenatal/common';
import { ObservationsService } from './observations.service';
import { CreateObservationDto } from './dto/create-observation.dto';
import { UpdateObservationDto } from './dto/update-observation.dto';

@Controller('observations')
@ApiTags('Clinical Observations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ObservationsController {
  constructor(private readonly observationsService: ObservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova observação clínica' })
  create(@Body() createObservationDto: CreateObservationDto) {
    return this.observationsService.create(createObservationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar observações com filtros' })
  @ApiQuery({ name: 'citizenId', required: false, description: 'Filtrar por ID da cidadã' })
  @ApiQuery({ name: 'pregnancyId', required: false, description: 'Filtrar por ID da gravidez' })
  @ApiQuery({ name: 'loincCode', required: false, description: 'Filtrar por código LOINC' })
  @ApiQuery({ name: 'category', required: false, description: 'Filtrar por categoria' })
  findAll(
    @Query('citizenId') citizenId?: string,
    @Query('pregnancyId') pregnancyId?: string,
    @Query('loincCode') loincCode?: string,
    @Query('category') category?: string,
  ) {
    return this.observationsService.findAll({
      citizenId,
      pregnancyId,
      loincCode,
      category,
    });
  }

  @Get('vital-signs/:citizenId')
  @ApiOperation({ summary: 'Obter sinais vitais de uma cidadã' })
  @ApiParam({ name: 'citizenId', description: 'ID da cidadã' })
  @ApiQuery({ name: 'pregnancyId', required: false, description: 'Filtrar por gravidez específica' })
  getVitalSigns(
    @Param('citizenId', ParseUUIDPipe) citizenId: string,
    @Query('pregnancyId') pregnancyId?: string,
  ) {
    return this.observationsService.getVitalSigns(citizenId, pregnancyId);
  }

  @Get('lab-results/:citizenId')
  @ApiOperation({ summary: 'Obter resultados de exames laboratoriais' })
  @ApiParam({ name: 'citizenId', description: 'ID da cidadã' })
  @ApiQuery({ name: 'pregnancyId', required: false, description: 'Filtrar por gravidez específica' })
  getLabResults(
    @Param('citizenId', ParseUUIDPipe) citizenId: string,
    @Query('pregnancyId') pregnancyId?: string,
  ) {
    return this.observationsService.getLabResults(citizenId, pregnancyId);
  }

  @Get('abnormal/:citizenId')
  @ApiOperation({ summary: 'Obter resultados anormais' })
  @ApiParam({ name: 'citizenId', description: 'ID da cidadã' })
  @ApiQuery({ name: 'pregnancyId', required: false, description: 'Filtrar por gravidez específica' })
  getAbnormalResults(
    @Param('citizenId', ParseUUIDPipe) citizenId: string,
    @Query('pregnancyId') pregnancyId?: string,
  ) {
    return this.observationsService.getAbnormalResults(citizenId, pregnancyId);
  }

  @Get('critical/:citizenId')
  @ApiOperation({ summary: 'Obter resultados críticos' })
  @ApiParam({ name: 'citizenId', description: 'ID da cidadã' })
  @ApiQuery({ name: 'pregnancyId', required: false, description: 'Filtrar por gravidez específica' })
  getCriticalResults(
    @Param('citizenId', ParseUUIDPipe) citizenId: string,
    @Query('pregnancyId') pregnancyId?: string,
  ) {
    return this.observationsService.getCriticalResults(citizenId, pregnancyId);
  }

  @Get('history/:citizenId/:loincCode')
  @ApiOperation({ summary: 'Obter histórico de uma observação específica' })
  @ApiParam({ name: 'citizenId', description: 'ID da cidadã' })
  @ApiParam({ name: 'loincCode', description: 'Código LOINC da observação' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limite de resultados', example: 10 })
  getObservationHistory(
    @Param('citizenId', ParseUUIDPipe) citizenId: string,
    @Param('loincCode') loincCode: string,
    @Query('limit') limit?: number,
  ) {
    return this.observationsService.getObservationHistory(citizenId, loincCode, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter observação por ID' })
  @ApiParam({ name: 'id', description: 'ID da observação' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.observationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar observação' })
  @ApiParam({ name: 'id', description: 'ID da observação' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateObservationDto: UpdateObservationDto,
  ) {
    return this.observationsService.update(id, updateObservationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover observação (soft delete)' })
  @ApiParam({ name: 'id', description: 'ID da observação' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.observationsService.remove(id);
  }
}
