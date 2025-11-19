import { Injectable, Scope, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { LogContext, LogLevel, LoggerConfig } from '../interfaces/log-context.interface';

/**
 * Custom Logger Service usando Winston
 * Fornece logs estruturados em JSON com contexto rico
 */
@Injectable({ scope: Scope.TRANSIENT })
export class AppLoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;
  private static globalContext: LogContext = {};

  constructor(private config?: LoggerConfig) {
    this.logger = this.createLogger(config);
  }

  /**
   * Define o contexto do logger (Controller, Service, etc.)
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Define contexto global (requestId, userId, etc.)
   */
  static setGlobalContext(context: Partial<LogContext>): void {
    AppLoggerService.globalContext = {
      ...AppLoggerService.globalContext,
      ...context,
    };
  }

  /**
   * Limpa o contexto global
   */
  static clearGlobalContext(): void {
    AppLoggerService.globalContext = {};
  }

  /**
   * Cria a instância do Winston Logger
   */
  private createLogger(config?: LoggerConfig): winston.Logger {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const level = config?.level || (isDevelopment ? LogLevel.DEBUG : LogLevel.INFO);
    const appName = config?.appName || process.env.npm_package_name || 'app';

    const formats = [];

    // Timestamp
    formats.push(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }));

    // Adiciona contexto e metadados
    formats.push(
      winston.format((info) => {
        info.app = appName;
        if (this.context) {
          info.context = this.context;
        }
        // Merge com contexto global
        return { ...info, ...AppLoggerService.globalContext };
      })(),
    );

    // Errors
    formats.push(winston.format.errors({ stack: true }));

    const transports: winston.transport[] = [];

    // Console transport com pretty print e cores
    if (config?.enableConsole !== false) {
      const consoleFormats = [...formats];

      // Adiciona cores ANTES do printf
      consoleFormats.push(winston.format.colorize({ all: true }));

      // Pretty print SEMPRE (desenvolvimento e produção)
      if (config?.prettyPrint !== false) {
        consoleFormats.push(
          winston.format.printf(({ timestamp, level, message, context, requestId, duration, ...meta }) => {
            const contextStr = context ? `[${context}]` : '';
            const requestIdStr = requestId ? `[${requestId}]` : '';
            const durationStr = duration ? `+${duration}ms` : '';

            let metaStr = '';
            const filteredMeta = { ...meta };
            delete filteredMeta.app;
            delete filteredMeta.timestamp;

            if (Object.keys(filteredMeta).length > 0) {
              metaStr = '\n' + JSON.stringify(filteredMeta, null, 2);
            }

            return `${timestamp} ${level.toUpperCase().padEnd(7)} ${contextStr}${requestIdStr} ${message} ${durationStr}${metaStr}`;
          }),
        );
      } else {
        // JSON somente se explicitamente desabilitado
        consoleFormats.push(winston.format.json());
      }

      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(...consoleFormats),
        }),
      );
    }

    // File transports
    if (config?.enableFile) {
      const logDir = config.logDir || 'logs';

      if (config.enableRotation) {
        // Rotation diária para erros
        transports.push(
          new DailyRotateFile({
            dirname: logDir,
            filename: 'error-%DATE%.log',
            level: 'error',
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            format: winston.format.combine(...formats),
          }),
        );

        // Rotation diária para todos os logs
        transports.push(
          new DailyRotateFile({
            dirname: logDir,
            filename: 'combined-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            format: winston.format.combine(...formats),
          }),
        );
      } else {
        transports.push(
          new winston.transports.File({
            dirname: logDir,
            filename: 'error.log',
            level: 'error',
            format: winston.format.combine(...formats),
          }),
        );
        transports.push(
          new winston.transports.File({
            dirname: logDir,
            filename: 'combined.log',
            format: winston.format.combine(...formats),
          }),
        );
      }
    }

    return winston.createLogger({
      level,
      transports,
      exitOnError: false,
    });
  }

  /**
   * Log genérico com contexto
   */
  private logWithContext(level: string, message: any, contextOrMeta?: string | LogContext): void {
    // Se contextOrMeta é string, é o contexto do NestJS
    // Se é objeto, são metadados adicionais
    const isNestContext = typeof contextOrMeta === 'string';
    const contextName = isNestContext ? contextOrMeta : this.context;
    const meta = isNestContext ? {} : (contextOrMeta || {});

    this.logger.log(level, message, {
      context: contextName,
      ...meta,
    });
  }

  /**
   * Log nível ERROR
   */
  error(message: any, trace?: string, context?: string): void;
  error(message: any, context?: LogContext): void;
  error(message: any, trace?: string, context?: LogContext): void;
  error(message: any, traceOrContext?: string | LogContext, context?: string | LogContext): void {
    // Se segundo parâmetro é objeto E não há terceiro, é contexto customizado sem stack
    if (typeof traceOrContext === 'object' && !context) {
      this.logger.error(message, {
        context: this.context,
        ...traceOrContext,
      });
    } else if (typeof traceOrContext === 'string' && typeof context === 'object') {
      // Stack trace + contexto objeto
      this.logger.error(message, {
        context: this.context,
        stack: traceOrContext,
        ...context,
      });
    } else {
      // NestJS passa: message, stack?, context?
      const contextName = typeof context === 'string' ? context : this.context;
      this.logger.error(message, {
        context: contextName,
        stack: typeof traceOrContext === 'string' ? traceOrContext : undefined,
      });
    }
  }

  /**
   * Log nível WARN
   */
  warn(message: any, context?: string | LogContext): void {
    this.logWithContext('warn', message, context);
  }

  /**
   * Log nível INFO
   */
  log(message: any, context?: string | LogContext): void {
    this.logWithContext('info', message, context);
  }

  /**
   * Log nível DEBUG
   */
  debug(message: any, context?: string | LogContext): void {
    this.logWithContext('debug', message, context);
  }

  /**
   * Log nível VERBOSE
   */
  verbose(message: any, context?: string | LogContext): void {
    this.logWithContext('verbose', message, context);
  }

  /**
   * Log de requisição HTTP
   */
  http(message: string, context: LogContext): void {
    this.logWithContext('http', message, context);
  }

  /**
   * Log de entrada de método
   */
  methodEntry(methodName: string, args?: any): void {
    this.debug(`→ Entering ${methodName}`, { args });
  }

  /**
   * Log de saída de método
   */
  methodExit(methodName: string, result?: any, duration?: number): void {
    this.debug(`← Exiting ${methodName}`, { result, duration });
  }

  /**
   * Log de performance
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    const level = duration > 1000 ? 'warn' : 'info';
    this.logWithContext(level, `Performance: ${operation}`, {
      ...context,
      duration,
      slow: duration > 1000,
    });
  }
}
