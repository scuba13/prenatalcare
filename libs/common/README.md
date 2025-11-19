# @prenatal/common

Shared utilities, logging, and error handling for the prenatal system monorepo.

## Features

### 📝 Structured Logging (Winston)
- JSON structured logs for production
- Pretty print for development
- Log levels: error, warn, info, http, debug, verbose
- Request correlation with requestId
- Context awareness (Controller, Service, etc.)
- Daily file rotation
- Performance tracking

### 🛡️ Exception Handling
- Global exception filters
- Standardized error responses
- Validation error formatting
- Stack traces in development only
- Automatic error logging

### 🔍 Request Tracking
- Unique requestId for each request
- Request/Response logging
- Performance monitoring
- Metadata collection (IP, User-Agent, etc.)

### 🎯 Decorators
- `@Log()` - Logs method entry/exit
- `@TrackPerformance(threshold)` - Tracks method performance
- `@Audit(operation)` - Audits sensitive operations

## Installation

```bash
# Install dependencies in the common library
cd libs/common
npm install
npm run build
```

## Usage

### 1. Import in your NestJS module

```typescript
import { Module } from '@nestjs/common';
import { LoggerModule } from '@prenatal/common';

@Module({
  imports: [
    LoggerModule.forRoot({
      level: 'debug',
      prettyPrint: true,
      enableFile: true,
      enableRotation: true,
      logDir: 'logs',
      appName: 'core-service',
    }),
  ],
})
export class AppModule {}
```

### 2. Setup global filters and middlewares

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  AppLoggerService,
  AllExceptionsFilter,
  ValidationExceptionFilter,
  RequestIdMiddleware,
  RequestLoggerMiddleware,
} from '@prenatal/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Logger
  const logger = app.get(AppLoggerService);
  app.useLogger(logger);

  // Global filters
  app.useGlobalFilters(
    new AllExceptionsFilter(logger),
    new ValidationExceptionFilter(logger),
  );

  // Middlewares
  app.use(new RequestIdMiddleware().use.bind(new RequestIdMiddleware()));

  await app.listen(3000);
}
bootstrap();
```

### 3. Use in your services

```typescript
import { Injectable } from '@nestjs/common';
import { AppLoggerService, Log, TrackPerformance, Audit } from '@prenatal/common';

@Injectable()
export class UserService {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('UserService');
  }

  @Log()
  @TrackPerformance(500)
  async findUser(id: string) {
    this.logger.log('Finding user', { userId: id });
    // ... your code
  }

  @Audit('DELETE_USER')
  async deleteUser(id: string) {
    this.logger.warn('Deleting user', { userId: id });
    // ... your code
  }

  handleError() {
    this.logger.error('Something went wrong', error.stack, {
      userId: '123',
      operation: 'createUser',
    });
  }
}
```

### 4. Log Examples

**Development (Pretty Print):**
```
2025-11-19 00:00:00.000 INFO    [UserService][req-123-abc] Finding user +15ms
{
  "userId": "123"
}
```

**Production (JSON):**
```json
{
  "timestamp": "2025-11-19T00:00:00.000Z",
  "level": "info",
  "context": "UserService",
  "requestId": "req-123-abc",
  "message": "Finding user",
  "userId": "123",
  "duration": 15,
  "app": "core-service"
}
```

## API

### AppLoggerService

```typescript
logger.setContext('MyContext');
logger.log('message', { key: 'value' });
logger.error('error message', stack, { key: 'value' });
logger.warn('warning', { key: 'value' });
logger.debug('debug info', { key: 'value' });
logger.http('HTTP request', { method: 'GET', url: '/api' });
logger.performance('operation', duration, { key: 'value' });
```

### Decorators

```typescript
@Log() // Logs method entry/exit
async myMethod() {}

@TrackPerformance(1000) // Warns if takes > 1000ms
async slowMethod() {}

@Audit('SENSITIVE_OPERATION') // Audit log
async sensitiveMethod() {}
```

## Configuration

```typescript
interface LoggerConfig {
  level?: 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug';
  enableFile?: boolean;
  logDir?: string;
  enableRotation?: boolean;
  prettyPrint?: boolean;
  enableConsole?: boolean;
  appName?: string;
}
```

## Environment Variables

```bash
NODE_ENV=production  # 'production' or 'development'
```

## License

MIT
