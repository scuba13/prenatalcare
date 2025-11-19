import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { SyncCursor } from '../entities/sync-cursor.entity';
import { SyncError } from '../entities/sync-error.entity';
import { FhirModule } from '../fhir/fhir.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SyncCursor, SyncError]),
    FhirModule,
  ],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
