import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@Controller()
@ApiTags('Health')
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Health check' })
  getHealth() {
    return {
      status: 'ok',
      service: 'RNDS Integration Service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Detailed health check' })
  getDetailedHealth() {
    return {
      status: 'healthy',
      service: 'rnds-service',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  }
}
