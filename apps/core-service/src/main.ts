import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import {
  AppLoggerService,
  AllExceptionsFilter,
  ValidationExceptionFilter,
  LoggerInterceptor,
  RequestIdMiddleware,
  RequestLoggerMiddleware,
} from '@prenatal/common';

async function bootstrap() {
  // Create logger BEFORE NestFactory to ensure Winston controls output
  const customLogger = new AppLoggerService({
    appName: 'core-service',
    enableConsole: true,
  });
  customLogger.setContext('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: customLogger,
  });

  // Use the same logger instance
  const logger = customLogger;

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global filters para tratamento de erros
  app.useGlobalFilters(
    new AllExceptionsFilter(logger),
    new ValidationExceptionFilter(logger),
  );

  // Global interceptor para logging de requisições
  app.useGlobalInterceptors(new LoggerInterceptor(logger));

  // Middlewares
  app.use(new RequestIdMiddleware().use.bind(new RequestIdMiddleware()));
  app.use(
    new RequestLoggerMiddleware(logger).use.bind(
      new RequestLoggerMiddleware(logger),
    ),
  );

  // CORS
  app.enableCors();

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Prenatal Core Service API')
    .setDescription('Core business logic for prenatal care system')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`🚀 Core Service running on: http://localhost:${port}`);
  logger.log(`📚 Swagger docs available at: http://localhost:${port}/api`);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start Core Service:', error);
  process.exit(1);
});
