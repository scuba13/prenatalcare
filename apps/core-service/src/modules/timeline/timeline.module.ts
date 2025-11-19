import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Citizen } from '../../entities/citizen.entity';
import { Pregnancy } from '../../entities/pregnancy.entity';
import { Task } from '../../entities/task.entity';
import { CarePlan } from '../../entities/care-plan.entity';
import { Consent } from '../../entities/consent.entity';
import { TimelineService } from './timeline.service';
import { TimelineController } from './timeline.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Citizen,
      Pregnancy,
      Task,
      CarePlan,
      Consent,
    ]),
  ],
  controllers: [TimelineController],
  providers: [TimelineService],
  exports: [TimelineService],
})
export class TimelineModule {}
