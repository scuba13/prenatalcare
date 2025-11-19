import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FhirController } from './fhir.controller';
import { AuthController } from './auth.controller';

@Module({
  imports: [],
  controllers: [AppController, FhirController, AuthController],
  providers: [AppService],
})
export class AppModule {}
