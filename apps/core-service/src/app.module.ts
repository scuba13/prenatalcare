import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CitizensModule } from './modules/citizens/citizens.module';
import { PregnanciesModule } from './modules/pregnancies/pregnancies.module';
import { CarePlansModule } from './modules/care-plans/care-plans.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ConsentsModule } from './modules/consents/consents.module';
import { TimelineModule } from './modules/timeline/timeline.module';
import { ObservationsModule } from './modules/observations/observations.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { InternalModule } from './modules/internal/internal.module';
import { AuthModule } from '@prenatal/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get('DB_PORT'),
        username: config.get('DB_USER'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: config.get('NODE_ENV') === 'development',
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    // Auth Module (shared)
    AuthModule.forRoot(),
    // Feature Modules
    CitizensModule,
    PregnanciesModule,
    CarePlansModule,
    TasksModule,
    ConsentsModule,
    TimelineModule,
    ObservationsModule,
    DashboardModule,
    AlertsModule,
    InternalModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
