import { Module } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';

/**
 * Módulo de Mensageria
 * Centraliza serviços de mensageria (RabbitMQ)
 */
@Module({
  providers: [RabbitMQService],
  exports: [RabbitMQService],
})
export class MessagingModule {}
