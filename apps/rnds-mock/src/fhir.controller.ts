import { Controller, Get, Post, Body, Query, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { mockPatients } from './data/patients.data';
import { mockConditions } from './data/conditions.data';
import { mockObservations } from './data/observations.data';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('FHIR')
@Controller()
export class FhirController {
  // Simular latência de rede
  private async simulateLatency() {
    const delay = Math.floor(Math.random() * 400) + 100; // 100-500ms
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  // Helper para criar Bundle FHIR
  private createBundle(resourceType: string, entries: any[], total: number, nextUrl?: string) {
    const bundle: any = {
      resourceType: 'Bundle',
      type: 'searchset',
      total,
      entry: entries.map(resource => ({
        fullUrl: `http://localhost:3003/${resourceType}/${resource.id}`,
        resource,
      })),
    };

    if (nextUrl) {
      bundle.link = [
        {
          relation: 'self',
          url: 'http://localhost:3003/' + resourceType,
        },
        {
          relation: 'next',
          url: nextUrl,
        },
      ];
    }

    return bundle;
  }

  @Get('metadata')
  @ApiOperation({ summary: 'Obter CapabilityStatement (metadados do servidor FHIR)' })
  @ApiResponse({ status: 200, description: 'CapabilityStatement' })
  async getMetadata() {
    await this.simulateLatency();

    return {
      resourceType: 'CapabilityStatement',
      status: 'active',
      date: '2025-11-18',
      publisher: 'RNDS Mock Server',
      kind: 'instance',
      software: {
        name: 'RNDS Mock',
        version: '1.0.0',
      },
      implementation: {
        description: 'Mock server para desenvolvimento e testes',
        url: 'http://localhost:3003',
      },
      fhirVersion: '4.0.1',
      format: ['json'],
      rest: [
        {
          mode: 'server',
          resource: [
            {
              type: 'Patient',
              profile: 'http://www.saude.gov.br/fhir/r4/StructureDefinition/BRIndividuo-1.0',
              interaction: [
                { code: 'read' },
                { code: 'search-type' },
              ],
              searchParam: [
                { name: 'identifier', type: 'token' },
                { name: '_lastUpdated', type: 'date' },
              ],
            },
            {
              type: 'Condition',
              interaction: [
                { code: 'read' },
                { code: 'search-type' },
              ],
              searchParam: [
                { name: 'patient', type: 'reference' },
                { name: '_lastUpdated', type: 'date' },
              ],
            },
            {
              type: 'Observation',
              interaction: [
                { code: 'read' },
                { code: 'search-type' },
              ],
              searchParam: [
                { name: 'patient', type: 'reference' },
                { name: '_lastUpdated', type: 'date' },
              ],
            },
          ],
        },
      ],
    };
  }

  @Get('Patient')
  @ApiOperation({ summary: 'Buscar pacientes' })
  @ApiQuery({ name: 'identifier', required: false, description: 'CPF ou CNS do paciente' })
  @ApiQuery({ name: '_lastUpdated', required: false, description: 'Filtro de última atualização (ge, le)' })
  @ApiQuery({ name: '_count', required: false, description: 'Número de resultados por página', example: 10 })
  @ApiResponse({ status: 200, description: 'Bundle de pacientes' })
  async searchPatients(
    @Query('identifier') identifier?: string,
    @Query('_lastUpdated') lastUpdated?: string,
    @Query('_count') count?: number,
  ) {
    await this.simulateLatency();

    let results = [...mockPatients];

    // Filtrar por identifier (CPF ou CNS)
    if (identifier) {
      const cleanIdentifier = identifier.replace(/\D/g, ''); // Remove formatação
      results = results.filter(patient =>
        patient.identifier.some(id => id.value === cleanIdentifier),
      );
    }

    // Filtrar por _lastUpdated
    if (lastUpdated) {
      const match = lastUpdated.match(/(ge|le)(.*)/);
      if (match) {
        const operator = match[1];
        const date = new Date(match[2]);
        results = results.filter(patient => {
          const patientDate = new Date(patient.meta.lastUpdated);
          return operator === 'ge' ? patientDate >= date : patientDate <= date;
        });
      }
    }

    // Paginação
    const pageSize = count || 10;
    const paginatedResults = results.slice(0, pageSize);
    const hasMore = results.length > pageSize;

    const nextUrl = hasMore ? `http://localhost:3003/Patient?_count=${pageSize}&_offset=${pageSize}` : undefined;

    return this.createBundle('Patient', paginatedResults, results.length, nextUrl);
  }

  @Get('Patient/:id')
  @ApiOperation({ summary: 'Obter paciente por ID' })
  @ApiParam({ name: 'id', description: 'ID do paciente' })
  @ApiResponse({ status: 200, description: 'Paciente encontrado' })
  @ApiResponse({ status: 404, description: 'Paciente não encontrado' })
  async getPatient(@Param('id') id: string) {
    await this.simulateLatency();

    const patient = mockPatients.find(p => p.id === id);
    if (!patient) {
      return {
        resourceType: 'OperationOutcome',
        issue: [{
          severity: 'error',
          code: 'not-found',
          diagnostics: `Patient/${id} not found`,
        }],
      };
    }

    return patient;
  }

  @Get('Condition')
  @ApiOperation({ summary: 'Buscar conditions (gestações)' })
  @ApiQuery({ name: 'patient', required: false, description: 'ID do paciente' })
  @ApiQuery({ name: '_lastUpdated', required: false, description: 'Filtro de última atualização' })
  @ApiResponse({ status: 200, description: 'Bundle de conditions' })
  async searchConditions(
    @Query('patient') patient?: string,
    @Query('_lastUpdated') lastUpdated?: string,
  ) {
    await this.simulateLatency();

    let results = [...mockConditions];

    // Filtrar por paciente
    if (patient) {
      const patientRef = patient.includes('/') ? patient : `Patient/${patient}`;
      results = results.filter(c => c.subject.reference === patientRef);
    }

    // Filtrar por _lastUpdated
    if (lastUpdated) {
      const match = lastUpdated.match(/(ge|le)(.*)/);
      if (match) {
        const operator = match[1];
        const date = new Date(match[2]);
        results = results.filter(condition => {
          const conditionDate = new Date(condition.meta.lastUpdated);
          return operator === 'ge' ? conditionDate >= date : conditionDate <= date;
        });
      }
    }

    return this.createBundle('Condition', results, results.length);
  }

  @Get('Observation')
  @ApiOperation({ summary: 'Buscar observations (exames, sinais vitais)' })
  @ApiQuery({ name: 'patient', required: false, description: 'ID do paciente' })
  @ApiQuery({ name: '_lastUpdated', required: false, description: 'Filtro de última atualização' })
  @ApiResponse({ status: 200, description: 'Bundle de observations' })
  async searchObservations(
    @Query('patient') patient?: string,
    @Query('_lastUpdated') lastUpdated?: string,
  ) {
    await this.simulateLatency();

    let results = [...mockObservations];

    // Filtrar por paciente
    if (patient) {
      const patientRef = patient.includes('/') ? patient : `Patient/${patient}`;
      results = results.filter(o => o.subject.reference === patientRef);
    }

    // Filtrar por _lastUpdated
    if (lastUpdated) {
      const match = lastUpdated.match(/(ge|le)(.*)/);
      if (match) {
        const operator = match[1];
        const date = new Date(match[2]);
        results = results.filter(obs => {
          const obsDate = new Date(obs.meta.lastUpdated);
          return operator === 'ge' ? obsDate >= date : obsDate <= date;
        });
      }
    }

    return this.createBundle('Observation', results, results.length);
  }

  @Post('Bundle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submeter Bundle transacional' })
  @ApiResponse({ status: 200, description: 'Bundle processado com sucesso' })
  @ApiResponse({ status: 422, description: 'Erro de validação' })
  async processBundle(@Body() bundle: any) {
    await this.simulateLatency();

    // Validação básica
    if (!bundle || bundle.resourceType !== 'Bundle') {
      return {
        resourceType: 'OperationOutcome',
        issue: [{
          severity: 'error',
          code: 'invalid',
          diagnostics: 'Invalid Bundle resource',
        }],
      };
    }

    // Simular processamento bem-sucedido
    const responseEntries = (bundle.entry || []).map((entry: any, index: number) => ({
      response: {
        status: '201 Created',
        location: `${entry.resource.resourceType}/${uuidv4()}`,
        etag: '1',
        lastModified: new Date().toISOString(),
      },
    }));

    return {
      resourceType: 'Bundle',
      type: 'transaction-response',
      entry: responseEntries,
    };
  }
}
