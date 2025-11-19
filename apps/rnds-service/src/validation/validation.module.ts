import { Module } from '@nestjs/common';
import { FhirValidatorService } from './fhir-validator.service';

@Module({
  providers: [FhirValidatorService],
  exports: [FhirValidatorService],
})
export class ValidationModule {}
