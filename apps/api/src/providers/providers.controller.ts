import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';

@Controller('providers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProvidersController {
  constructor(private providersService: ProvidersService) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPPORT')
  async findAll() {
    return this.providersService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async findOne(@Param('id') id: string) {
    return this.providersService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateProviderDto) {
    return this.providersService.create(dto);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async update(@Param('id') id: string, @Body() dto: UpdateProviderDto) {
    return this.providersService.update(id, dto);
  }

  @Post(':id/pause')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async pause(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return this.providersService.pauseProvider(id, actorId);
  }

  @Post(':id/resume')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async resume(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return this.providersService.resumeProvider(id, actorId);
  }
}
