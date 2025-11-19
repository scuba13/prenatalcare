import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Citizen } from '../../entities/citizen.entity';
import { CitizensService } from './citizens.service';
import { CitizensController } from './citizens.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Citizen])],
  controllers: [CitizensController],
  providers: [CitizensService],
  exports: [CitizensService],
})
export class CitizensModule {}
