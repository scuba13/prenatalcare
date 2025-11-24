import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Entities
import { Notification } from './entities/notification.entity';
import { UserPreference } from './entities/user-preference.entity';

// Services
import { NotificationsService } from './services/notifications.service';

// Providers
import { FirebaseProvider } from './providers/firebase.provider';
import { SendGridProvider } from './providers/sendgrid.provider';
import { TwilioProvider } from './providers/twilio.provider';

// Messaging
import { RabbitMQService } from './messaging/rabbitmq.service';
import { EventListener } from './messaging/event.listener';

// Workers
import { ReminderWorker } from './workers/reminder.worker';

// Controllers
import { NotificationsController } from './controllers/notifications.controller';
import { PreferencesController } from './controllers/preferences.controller';

// Auth
import { AuthModule } from '@prenatal/common';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USER', 'prenatal'),
        password: configService.get('DATABASE_PASSWORD', 'prenatal123'),
        database: configService.get('DATABASE_NAME', 'prenatal_notifications'),
        entities: [Notification, UserPreference],
        synchronize: configService.get('NODE_ENV') !== 'production', // Auto-sync em dev
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),

    TypeOrmModule.forFeature([Notification, UserPreference]),

    // Schedule (para cron jobs)
    ScheduleModule.forRoot(),

    // HTTP (para chamar outros serviços)
    HttpModule,

    // Auth Module (shared)
    AuthModule.forRoot(),
  ],
  controllers: [AppController, NotificationsController, PreferencesController],
  providers: [
    AppService,
    NotificationsService,
    FirebaseProvider,
    SendGridProvider,
    TwilioProvider,
    RabbitMQService,
    EventListener,
    ReminderWorker,
  ],
})
export class AppModule {}
