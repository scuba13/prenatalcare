import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Consent } from '../../entities/consent.entity';
import { ConsentsService } from './consents.service';
import { ConsentsController } from './consents.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Consent])],
  controllers: [ConsentsController],
  providers: [ConsentsService],
  exports: [ConsentsService],
})
export class ConsentsModule {}
