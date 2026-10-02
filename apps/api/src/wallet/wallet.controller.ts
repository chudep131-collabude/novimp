import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get()
  async getWallet(@CurrentUser('id') userId: string) {
    return this.walletService.getWallet(userId);
  }

  @Get('transactions')
  async getTransactions(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.walletService.getTransactions(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  // ── Admin endpoints ──────────────────────────────────────────────────────

  /** GET /wallet/admin/user/:userId/transactions */
  @Get('admin/user/:userId/transactions')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FINANCE')
  @UseGuards(RolesGuard)
  async getUserTransactions(
    @Param('userId') targetUserId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.walletService.getUserTransactions(
      targetUserId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /** POST /wallet/admin/adjust */
  @Post('admin/adjust')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FINANCE')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  async adminAdjust(
    @CurrentUser('id') actorId: string,
    @Body('userId') targetUserId: string,
    @Body('amount') amount: number,
    @Body('type') type: 'ADJUSTMENT' | 'BONUS' | 'CHARGEBACK',
    @Body('description') description: string,
    @Body('reason') reason: string,
  ) {
    return this.walletService.adminAdjust(actorId, targetUserId, amount, type, description, reason);
  }

  /** POST /wallet/reconcile */
  @Post('reconcile')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FINANCE')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  async reconcile(@Body('userId') userId?: string) {
    return this.walletService.reconcile(userId);
  }
}
