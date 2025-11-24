import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from '../services/notifications.service';
import { UpdatePreferenceDto } from '../dto/update-preference.dto';

@ApiTags('Preferences')
@Controller('preferences')
export class PreferencesController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get(':citizenId')
  @ApiOperation({ summary: 'Buscar preferências de notificação de um cidadão' })
  @ApiParam({ name: 'citizenId', description: 'UUID do cidadão' })
  @ApiResponse({ status: 200, description: 'Preferências encontradas' })
  async getPreferences(@Param('citizenId') citizenId: string) {
    return await this.notificationsService.getOrCreatePreferences(citizenId);
  }

  @Put(':citizenId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar preferências de notificação' })
  @ApiParam({ name: 'citizenId', description: 'UUID do cidadão' })
  @ApiResponse({ status: 200, description: 'Preferências atualizadas' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async updatePreferences(
    @Param('citizenId') citizenId: string,
    @Body() updatePreferenceDto: UpdatePreferenceDto,
  ) {
    return await this.notificationsService.updatePreferences(
      citizenId,
      updatePreferenceDto,
    );
  }
}
