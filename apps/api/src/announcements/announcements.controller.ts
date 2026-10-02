import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AnnouncementsService, CreateAnnouncementDto } from './announcements.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';

@Controller('announcements')
export class AnnouncementsController {
  constructor(private announcementsService: AnnouncementsService) {}

  /**
   * Public (authenticated): return active announcements for the dashboard.
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getActive() {
    return this.announcementsService.getActive();
  }

  /**
   * Admin: list all announcements (including inactive).
   */
  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async findAll() {
    return this.announcementsService.findAll();
  }

  /**
   * Admin: create a new announcement and broadcast to all Telegram users.
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateAnnouncementDto) {
    return this.announcementsService.create(dto);
  }

  /**
   * Admin: activate or deactivate an announcement.
   */
  @Patch(':id/active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async setActive(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.announcementsService.setActive(id, isActive);
  }
}
