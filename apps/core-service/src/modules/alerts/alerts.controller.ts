import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '@prenatal/common';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  async getAlerts(
    @Query('unread') unread?: string,
    @Query('limit') limit?: string,
  ) {
    return this.alertsService.getAlerts({
      unread: unread === 'true',
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.alertsService.markAsRead(id);
  }
}
