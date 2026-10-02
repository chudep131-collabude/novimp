import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import type { CreatePricingRuleDto, UpdatePricingRuleDto } from './admin.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FINANCE')
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('analytics/revenue')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FINANCE')
  async getRevenueChart(
    @Query('period') period?: string,
    @Query('days') days?: string,
  ) {
    const parsedDays = days ? Math.min(365, Math.max(1, parseInt(days, 10))) : 30;
    return this.adminService.getRevenueChart(period as any, parsedDays);
  }

  @Get('analytics/orders')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getOrderTrends(@Query('days') days?: string) {
    const parsedDays = days ? Math.min(365, Math.max(1, parseInt(days, 10))) : 30;
    return this.adminService.getOrderTrends(parsedDays);
  }

  @Get('providers/performance')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getProviderPerformance() {
    return this.adminService.getProviderPerformance();
  }

  @Get('audit-logs')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
  ) {
    return this.adminService.getAuditLogs(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
      action ? { action } : undefined,
    );
  }

  // ── Pricing rules ────────────────────────────────────────────────────────

  @Get('pricing-rules')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async listPricingRules() {
    return this.adminService.listPricingRules();
  }

  @Post('pricing-rules')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async createPricingRule(
    @CurrentUser('id') actorId: string,
    @Body() dto: CreatePricingRuleDto,
  ) {
    return this.adminService.createPricingRule(actorId, dto);
  }

  @Patch('pricing-rules/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updatePricingRule(
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePricingRuleDto,
  ) {
    return this.adminService.updatePricingRule(actorId, id, dto);
  }

  @Delete('pricing-rules/:id')
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePricingRule(
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
  ) {
    return this.adminService.deletePricingRule(actorId, id);
  }
}
