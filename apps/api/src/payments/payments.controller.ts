import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('deposit')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  async createDeposit(
    @CurrentUser('id') userId: string,
    @Body('amount') amount: number,
    @Body('gateway') gateway: string,
    @Body('currency') currency?: string,
    @Body('cryptoCurrency') cryptoCurrency?: string,
    @Body('paymentMethod') paymentMethod?: string,
  ) {
    return this.paymentsService.createDeposit(userId, amount, gateway, {
      currency,
      cryptoCurrency,
      paymentMethod,
    });
  }

  @Get('deposits')
  async getDeposits(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.getDeposits(
      userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('deposits/:id')
  async getDeposit(
    @CurrentUser('id') userId: string,
    @Param('id') depositId: string,
  ) {
    return this.paymentsService.getDeposit(userId, depositId);
  }

  // Webhook endpoint (no auth - signature verified internally)
  // Heleket sends POST to /payments/webhooks/crypto
  // Whitelist source IP 31.133.220.8 at your reverse proxy
  @Post('webhooks/:gateway')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('gateway') gateway: string,
    @Req() req: Request,
  ) {
    return this.paymentsService.handleWebhook(gateway, req.body, '');
  }

  // Admin endpoints
  @Get('admin/deposits')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FINANCE')
  @UseGuards(RolesGuard)
  async getAllDeposits(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.paymentsService.getDepositsForAdmin(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      { status, search },
    );
  }

  @Post('admin/deposits/:id/approve')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FINANCE')
  @UseGuards(RolesGuard)
  async manualApprove(
    @Param('id') depositId: string,
    @CurrentUser('id') adminId: string,
    @Body('notes') notes?: string,
  ) {
    return this.paymentsService.manualApproveDeposit(depositId, adminId, notes);
  }
}
