import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService } from '../services/notifications.service';
import { SendNotificationDto } from '../dto/send-notification.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Enviar notificação para um usuário' })
  @ApiResponse({ status: 201, description: 'Notificação enviada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async send(@Body() sendNotificationDto: SendNotificationDto) {
    return await this.notificationsService.sendNotification(
      sendNotificationDto,
    );
  }

  @Get('history/:citizenId')
  @ApiOperation({ summary: 'Buscar histórico de notificações de um cidadão' })
  @ApiParam({ name: 'citizenId', description: 'UUID do cidadão' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Histórico de notificações' })
  async getHistory(
    @Param('citizenId') citizenId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const parsedPage = page ? parseInt(page.toString(), 10) : 1;
    const parsedLimit = limit ? parseInt(limit.toString(), 10) : 20;

    return await this.notificationsService.getNotificationHistory(
      citizenId,
      parsedPage,
      parsedLimit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar notificação por ID' })
  @ApiParam({ name: 'id', description: 'UUID da notificação' })
  @ApiResponse({ status: 200, description: 'Notificação encontrada' })
  @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
  async findOne(@Param('id') id: string) {
    return await this.notificationsService.findById(id);
  }
}
