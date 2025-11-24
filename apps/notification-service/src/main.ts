import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Validation Pipe global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  app.enableCors();

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Notification Service API')
    .setDescription(
      'API para gerenciamento de notificações multi-canal (Push, Email, SMS)',
    )
    .setVersion('1.0')
    .addTag('Notifications', 'Endpoints de notificações')
    .addTag('Preferences', 'Endpoints de preferências do usuário')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3004;
  await app.listen(port);

  logger.log(`🚀 Notification Service running on: http://localhost:${port}`);
  logger.log(`📚 Swagger docs available at: http://localhost:${port}/api`);
}

bootstrap();
