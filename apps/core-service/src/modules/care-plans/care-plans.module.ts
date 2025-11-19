import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CarePlan } from '../../entities/care-plan.entity';
import { CarePlansService } from './care-plans.service';
import { CarePlansController } from './care-plans.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CarePlan])],
  controllers: [CarePlansController],
  providers: [CarePlansService],
  exports: [CarePlansService],
})
export class CarePlansModule {}
