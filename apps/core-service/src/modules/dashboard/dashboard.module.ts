import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Citizen } from '../../entities/citizen.entity';
import { Pregnancy } from '../../entities/pregnancy.entity';
import { Task } from '../../entities/task.entity';
import { AuthModule } from '@prenatal/common';

@Module({
  imports: [
    TypeOrmModule.forFeature([Citizen, Pregnancy, Task]),
    AuthModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
