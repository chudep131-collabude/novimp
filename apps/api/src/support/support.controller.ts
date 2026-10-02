import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AddMessageDto } from './dto/add-message.dto';

@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private supportService: SupportService) {}

  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  async createTicket(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTicketDto,
  ) {
    return this.supportService.createTicket(userId, dto);
  }

  @Get('tickets/stats')
  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPPORT')
  @UseGuards(RolesGuard)
  async getStats() {
    return this.supportService.getTicketStats();
  }

  @Get('tickets')
  async getTickets(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.supportService.getTickets(
      userId,
      role as any,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status as any,
    );
  }

  @Get('tickets/:id')
  async getTicket(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id') ticketId: string,
  ) {
    return this.supportService.getTicket(ticketId, userId, role as any);
  }

  @Post('tickets/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  async addMessage(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id') ticketId: string,
    @Body() dto: AddMessageDto,
  ) {
    return this.supportService.addMessage(
      ticketId,
      userId,
      role as any,
      dto.content,
      dto.isInternal,
    );
  }

  @Put('tickets/:id/status')
  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPPORT')
  @UseGuards(RolesGuard)
  async updateStatus(
    @Param('id') ticketId: string,
    @CurrentUser('id') adminId: string,
    @Body('status') status: string,
  ) {
    return this.supportService.updateTicketStatus(ticketId, status as any, adminId);
  }

  @Post('tickets/:id/assign')
  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPPORT')
  @UseGuards(RolesGuard)
  async assignTicket(
    @Param('id') ticketId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.supportService.assignTicket(ticketId, adminId);
  }
}
