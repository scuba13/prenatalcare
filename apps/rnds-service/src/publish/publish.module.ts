import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublishService } from './publish.service';
import { PublishController } from './publish.controller';
import { PublishLog } from '../entities/publish-log.entity';
import { SyncError } from '../entities/sync-error.entity';
import { FhirModule } from '../fhir/fhir.module';
import { ValidationModule } from '../validation/validation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PublishLog, SyncError]),
    FhirModule,
    ValidationModule,
  ],
  controllers: [PublishController],
  providers: [PublishService],
  exports: [PublishService],
})
export class PublishModule {}
