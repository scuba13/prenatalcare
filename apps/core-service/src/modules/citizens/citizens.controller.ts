import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@prenatal/common';
import { CitizensService } from './citizens.service';
import { CreateCitizenDto } from './dto/create-citizen.dto';
import { UpdateCitizenDto } from './dto/update-citizen.dto';

@ApiTags('Citizens')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('citizens')
export class CitizensController {
  constructor(private readonly citizensService: CitizensService) {}

  @Post()
  @Roles(UserRole.MEDICO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Criar novo cidadão' })
  @ApiResponse({ status: 201, description: 'Cidadão criado com sucesso' })
  @ApiResponse({ status: 409, description: 'CPF ou CNS já cadastrado' })
  create(@Body() createCitizenDto: CreateCitizenDto) {
    return this.citizensService.create({
      ...createCitizenDto,
      birthDate: new Date(createCitizenDto.birthDate),
      gender: createCitizenDto.gender || 'female', // Padrão: female para pré-natal
    });
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os cidadãos' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Lista de cidadãos' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.citizensService.findAll(page, limit);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar cidadãos por nome' })
  @ApiQuery({ name: 'name', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Cidadãos encontrados' })
  searchByName(@Query('name') name: string) {
    return this.citizensService.searchByName(name);
  }

  @Get('cpf/:cpf')
  @ApiOperation({ summary: 'Buscar cidadão por CPF' })
  @ApiParam({ name: 'cpf', description: 'CPF sem formatação', example: '12345678901' })
  @ApiResponse({ status: 200, description: 'Cidadão encontrado' })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  findByCpf(@Param('cpf') cpf: string) {
    return this.citizensService.findByCpf(cpf);
  }

  @Get('cns/:cns')
  @ApiOperation({ summary: 'Buscar cidadão por CNS' })
  @ApiParam({ name: 'cns', description: 'Cartão Nacional de Saúde' })
  @ApiResponse({ status: 200, description: 'Cidadão encontrado' })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  findByCns(@Param('cns') cns: string) {
    return this.citizensService.findByCns(cns);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Estatísticas de cidadãos' })
  @ApiResponse({ status: 200, description: 'Estatísticas' })
  getStatistics() {
    return this.citizensService.countByStatus();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar cidadão por ID' })
  @ApiParam({ name: 'id', description: 'UUID do cidadão' })
  @ApiResponse({ status: 200, description: 'Cidadão encontrado' })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  findOne(@Param('id') id: string) {
    return this.citizensService.findById(id, true);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar cidadão' })
  @ApiParam({ name: 'id', description: 'UUID do cidadão' })
  @ApiResponse({ status: 200, description: 'Cidadão atualizado' })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  update(@Param('id') id: string, @Body() updateCitizenDto: UpdateCitizenDto) {
    const updateData: any = { ...updateCitizenDto };
    if (updateCitizenDto.birthDate) {
      updateData.birthDate = new Date(updateCitizenDto.birthDate);
    }
    return this.citizensService.update(id, updateData);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar cidadão (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID do cidadão' })
  @ApiResponse({ status: 204, description: 'Cidadão deletado' })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  remove(@Param('id') id: string) {
    return this.citizensService.softDelete(id);
  }

  @Post(':id/anonymize')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Anonimizar dados do cidadão (LGPD)' })
  @ApiParam({ name: 'id', description: 'UUID do cidadão' })
  @ApiResponse({ status: 200, description: 'Cidadão anonimizado' })
  anonymize(@Param('id') id: string, @Body('reason') reason: string) {
    return this.citizensService.anonymize(id, reason);
  }
}
