import './polyfill';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Scheduling Service API')
    .setDescription(
      'API para gerenciamento de agendamentos com integração a sistemas externos via adapters',
    )
    .setVersion('1.0')
    .addTag('Scheduling', 'Endpoints de gerenciamento de agendamentos')
    .addTag('Health', 'Endpoints de health check e monitoramento')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3003;
  await app.listen(port);

  logger.log(`🚀 Scheduling Service running on port ${port}`);
  logger.log(`📚 Swagger documentation available at http://localhost:${port}/api`);
}
bootstrap();
