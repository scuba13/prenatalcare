import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { FhirModule } from './fhir/fhir.module';
import { SyncModule } from './sync/sync.module';
import { PublishModule } from './publish/publish.module';
import { WorkersModule } from './workers/workers.module';
import { SyncCursor } from './entities/sync-cursor.entity';
import { PublishLog } from './entities/publish-log.entity';
import { SyncError } from './entities/sync-error.entity';
import { LoggerModule, LogLevel } from '@prenatal/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggerModule.forRoot({
      level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
      prettyPrint: process.env.NODE_ENV !== 'production',
      enableFile: true,
      enableRotation: true,
      logDir: 'logs',
      appName: 'rnds-service',
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
        entities: [SyncCursor, PublishLog, SyncError],
        synchronize: config.get('NODE_ENV') === 'development',
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    TypeOrmModule.forFeature([SyncCursor, PublishLog, SyncError]),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    FhirModule,
    SyncModule,
    PublishModule,
    WorkersModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
