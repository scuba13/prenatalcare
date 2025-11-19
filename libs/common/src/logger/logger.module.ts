import { Module, Global, DynamicModule } from '@nestjs/common';
import { AppLoggerService } from './logger.service';
import { LoggerConfig } from '../interfaces/log-context.interface';

/**
 * Módulo de Logger Global
 * Pode ser configurado com LoggerModule.forRoot(config)
 */
@Global()
@Module({})
export class LoggerModule {
  static forRoot(config?: LoggerConfig): DynamicModule {
    return {
      module: LoggerModule,
      providers: [
        {
          provide: 'LOGGER_CONFIG',
          useValue: config || {},
        },
        {
          provide: AppLoggerService,
          useFactory: (loggerConfig: LoggerConfig) => {
            return new AppLoggerService(loggerConfig);
          },
          inject: ['LOGGER_CONFIG'],
        },
      ],
      exports: [AppLoggerService],
    };
  }
}
