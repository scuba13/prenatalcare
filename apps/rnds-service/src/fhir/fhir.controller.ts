import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { FhirClientService } from './fhir-client.service';

@Controller('fhir')
@ApiTags('FHIR')
@ApiBearerAuth()
export class FhirController {
  constructor(private readonly fhirClient: FhirClientService) {}

  @Get('metadata')
  @ApiOperation({ summary: 'Get FHIR CapabilityStatement from RNDS' })
  async getMetadata() {
    return this.fhirClient.getMetadata();
  }

  @Get('patient/search')
  @ApiOperation({ summary: 'Search patient by CPF or CNS' })
  @ApiQuery({ name: 'identifier', description: 'CPF or CNS', example: '12345678901' })
  async searchPatient(@Query('identifier') identifier: string) {
    const searchParams = `identifier=${identifier}`;
    return this.fhirClient.searchPatient(searchParams);
  }

  @Get('condition/search')
  @ApiOperation({ summary: 'Search conditions (pregnancies) for a patient' })
  @ApiQuery({ name: 'patient', description: 'Patient ID or reference', example: 'patient-001' })
  async searchConditions(@Query('patient') patient: string) {
    const searchParams = `patient=${patient}&code=http://snomed.info/sct|77386006`;
    return this.fhirClient.searchConditions(searchParams);
  }

  @Get('observation/search')
  @ApiOperation({ summary: 'Search observations for a patient' })
  @ApiQuery({ name: 'patient', description: 'Patient ID', example: 'patient-001' })
  @ApiQuery({ name: 'category', description: 'Observation category', required: false, example: 'vital-signs' })
  async searchObservations(
    @Query('patient') patient: string,
    @Query('category') category?: string,
  ) {
    let searchParams = `patient=${patient}`;
    if (category) {
      searchParams += `&category=${category}`;
    }
    return this.fhirClient.searchObservations(searchParams);
  }

  @Post('bundle')
  @ApiOperation({ summary: 'Submit FHIR Bundle to RNDS' })
  async postBundle(@Body() bundle: any) {
    return this.fhirClient.postBundle(bundle);
  }

  @Get('token/status')
  @ApiOperation({ summary: 'Check OAuth2 token status' })
  async getTokenStatus() {
    try {
      const token = await this.fhirClient.getAccessToken();
      return {
        status: 'valid',
        hasToken: !!token,
        tokenPreview: token ? `${token.substring(0, 20)}...` : null,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
      };
    }
  }
}
