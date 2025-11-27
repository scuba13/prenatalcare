import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('AuthService');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3005);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', '*'),
    credentials: true,
  });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Auth Service')
    .setDescription('API de Autenticação e Autorização do Sistema Pré-Natal')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Endpoints de autenticação')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(port);
  logger.log(`Auth Service rodando na porta ${port}`);
  logger.log(`Swagger disponível em http://localhost:${port}/api`);
}
bootstrap();
