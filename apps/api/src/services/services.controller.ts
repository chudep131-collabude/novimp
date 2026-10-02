import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ServiceCategory } from '@prisma/client';

@Controller('services')
@UseGuards(JwtAuthGuard)
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  @Get()
  async list(
    @Query('category') category?: string,
    @Query('platform') platform?: string,
    @Query('country') country?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.servicesService.listServices({
      category: category as ServiceCategory,
      platform,
      country,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('free-numbers')
  async getFreeNumbers(@Query('countryCode') countryCode: string) {
    return this.servicesService.getFreeNumbers(countryCode);
  }

  @Get('free-messages')
  async getFreeMessages(@Query('phone') phone: string) {
    return this.servicesService.getFreeMessages(phone);
  }

  /* ── Temporary email (mail.tm) ──────────────────────────────────────── */

  @Get('email/domains')
  async getEmailDomains() {
    return this.servicesService.getEmailDomains();
  }

  @Post('email/account')
  async createEmailAccount(
    @Body() body: { address: string; password: string },
  ) {
    return this.servicesService.createEmailAccount(body.address, body.password);
  }

  @Get('email/inbox')
  async getEmailInbox(
    @Query('address') address: string,
    @Query('token') token: string,
  ) {
    return this.servicesService.getEmailInbox(address, token);
  }

  @Get('email/message/:id')
  async getEmailMessage(
    @Param('id') id: string,
    @Query('token') token: string,
  ) {
    return this.servicesService.getEmailMessage(id, token);
  }

  @Get('proxy/tariffs')
  async getProxyTariffs(
    @Query('countryCode') countryCode: string,
    @Query('proxyType') proxyType: string,
    @Query('protocol') protocol: string,
  ) {
    return this.servicesService.getProxyTariffs(countryCode, proxyType, protocol);
  }

  @Get('categories')
  async getCategories() {
    return this.servicesService.getCategories();
  }

  @Get('platforms')
  async getPlatforms() {
    return this.servicesService.getPlatforms();
  }

  @Get(':id')
  async getService(@Param('id') id: string) {
    return this.servicesService.getService(id);
  }

  @Get(':id/price')
  async getPrice(
    @Param('id') id: string,
    @Query('quantity') quantity?: string,
  ) {
    const qty = quantity ? parseInt(quantity) : 1;
    return this.servicesService.resolvePrice(id, qty);
  }
}
