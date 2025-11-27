import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';
import { PregnanciesModule } from '../pregnancies/pregnancies.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [PregnanciesModule, TasksModule],
  controllers: [InternalController],
})
export class InternalModule {}
