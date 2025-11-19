import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FhirClientService } from './fhir-client.service';
import { FhirController } from './fhir.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  providers: [FhirClientService],
  controllers: [FhirController],
  exports: [FhirClientService],
})
export class FhirModule {}
