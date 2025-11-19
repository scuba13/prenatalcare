import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pregnancy } from '../../entities/pregnancy.entity';
import { PregnanciesService } from './pregnancies.service';
import { PregnanciesController } from './pregnancies.controller';
import { CitizensModule } from '../citizens/citizens.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pregnancy]),
    CitizensModule, // Importar para validar cidadãs
  ],
  controllers: [PregnanciesController],
  providers: [PregnanciesService],
  exports: [PregnanciesService],
})
export class PregnanciesModule {}
