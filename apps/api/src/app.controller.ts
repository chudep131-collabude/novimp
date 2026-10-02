import { Controller, Get, Head, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('root')
@Controller({
  version: VERSION_NEUTRAL,
})
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API root endpoint' })
  getRoot() {
    return {
      name: 'Marketplace API',
      status: 'running',
      timestamp: new Date().toISOString(),
    };
  }

  @Head()
  @ApiOperation({ summary: 'API root health check' })
  headRoot() {
    return;
  }
}
