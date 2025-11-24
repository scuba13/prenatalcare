import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import {
  AllExceptionsFilter,
  ValidationExceptionFilter,
  RequestIdMiddleware,
  RequestLoggerMiddleware,
} from '@prenatal/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

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
    new AllExceptionsFilter(),
    new ValidationExceptionFilter(),
  );

  // Middlewares
  app.use(new RequestIdMiddleware().use.bind(new RequestIdMiddleware()));
  app.use(
    new RequestLoggerMiddleware().use.bind(new RequestLoggerMiddleware()),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('RNDS Integration Service')
    .setDescription('API para integração com RNDS/DATASUS via FHIR R4')
    .setVersion('1.0')
    .addTag('FHIR')
    .addTag('Health')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3002;
  await app.listen(port);

  logger.log(`🚀 RNDS Service running on: http://localhost:${port}`);
  logger.log(`📚 Swagger docs available at: http://localhost:${port}/api`);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start RNDS Service:', error);
  process.exit(1);
});
