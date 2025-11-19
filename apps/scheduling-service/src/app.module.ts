import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Appointment } from './entities/appointment.entity';
import { AppointmentSyncLog } from './entities/appointment-sync-log.entity';
import { SchedulingService } from './services/scheduling.service';
import { MockSchedulingAdapter } from './adapters/mock/mock-scheduling.adapter';
import { RetryService } from './resilience/retry.service';
import { CircuitBreakerService } from './resilience/circuit-breaker.service';
import { SchedulingController } from './controllers/scheduling.controller';
import { HealthController } from './controllers/health.controller';
import { RabbitMQService } from './messaging/rabbitmq.service';
import { AppointmentListener } from './messaging/appointment.listener';

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
        entities: [Appointment, AppointmentSyncLog],
        migrations: ['dist/migrations/*.js'],
        synchronize: config.get('DB_SYNCHRONIZE') === 'true',
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    TypeOrmModule.forFeature([Appointment, AppointmentSyncLog]),
  ],
  controllers: [AppController, SchedulingController, HealthController],
  providers: [
    AppService,
    SchedulingService,
    RetryService,
    CircuitBreakerService,
    RabbitMQService,
    AppointmentListener,
    {
      provide: 'SCHEDULING_ADAPTER',
      useFactory: (config: ConfigService) => {
        const adapterType = config.get('ADAPTER_TYPE', 'mock');

        switch (adapterType) {
          case 'mock':
            return new MockSchedulingAdapter();
          // Future adapters:
          // case 'hospital-a':
          //   return new HospitalAAdapter(config);
          // case 'hospital-b':
          //   return new HospitalBAdapter(config);
          default:
            throw new Error(`Unknown adapter type: ${adapterType}`);
        }
      },
      inject: [ConfigService],
    },
  ],
})
export class AppModule {}
