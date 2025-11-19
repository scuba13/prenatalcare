import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('RNDS Mock Server')
    .setDescription('Mock server simulando a API RNDS/DATASUS para desenvolvimento e testes')
    .setVersion('1.0')
    .addTag('FHIR')
    .addTag('Auth')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3003);
  console.log(`🚀 RNDS Mock Server rodando em http://localhost:3003`);
  console.log(`📚 Swagger disponível em http://localhost:3003/api`);
}
bootstrap();
