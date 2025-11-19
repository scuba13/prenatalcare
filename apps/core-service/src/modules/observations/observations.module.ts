import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObservationsService } from './observations.service';
import { ObservationsController } from './observations.controller';
import { ClinicalObservation } from '../../entities/clinical-observation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ClinicalObservation])],
  controllers: [ObservationsController],
  providers: [ObservationsService],
  exports: [ObservationsService],
})
export class ObservationsModule {}
