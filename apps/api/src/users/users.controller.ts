import {
  Controller,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserRole, UserStatus } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  @Put('me')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  // ── Admin endpoints ──────────────────────────────────────────────────────

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPPORT')
  @UseGuards(RolesGuard)
  async listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.listUsers(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search,
    );
  }

  @Get('stats')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  async getStats() {
    return this.usersService.getUserStats();
  }

  /** Declared before /:id so Express doesn't swallow "stats" as an id. */
  @Patch(':id/status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  async updateStatus(
    @CurrentUser('id') actorId: string,
    @Param('id') targetId: string,
    @Body('status') status: UserStatus,
    @Body('reason') reason?: string,
  ) {
    return this.usersService.updateUserStatus(actorId, targetId, status, reason);
  }

  @Patch(':id/role')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  async updateRole(
    @CurrentUser('id') actorId: string,
    @CurrentUser('role') actorRole: UserRole,
    @Param('id') targetId: string,
    @Body('role') role: UserRole,
    @Body('reason') reason?: string,
  ) {
    return this.usersService.updateUserRole(actorId, actorRole, targetId, role, reason);
  }

  /** PATCH /users/me/telegram — link Telegram via initData */
  @Patch('me/telegram')
  @HttpCode(HttpStatus.OK)
  async linkTelegram(
    @CurrentUser('id') userId: string,
    @Body('initData') initData: string,
  ) {
    return this.usersService.linkTelegram(userId, initData);
  }

  /** DELETE /users/me/telegram — unlink Telegram */
  @Delete('me/telegram')
  @HttpCode(HttpStatus.OK)
  async unlinkTelegram(@CurrentUser('id') userId: string) {
    return this.usersService.unlinkTelegram(userId);
  }
}
