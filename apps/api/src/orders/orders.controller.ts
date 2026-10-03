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
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { Throttle } from '@nestjs/throttler';
import { OrderStatus } from '@prisma/client';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 orders per minute
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(userId, dto.serviceId, dto.quantity, {
      targetUrl: dto.targetUrl,
      targetUsername: dto.targetUsername,
      customData: dto.customData,
      idempotencyKey: dto.idempotencyKey,
    });
  }

  @Get()
  async getOrders(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.ordersService.getOrders(
      userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
    );
  }

  @Get('stats')
  async getStats(@CurrentUser('id') userId: string) {
    return this.ordersService.getOrderStats(userId);
  }

  // ----------------------------------------------------------------
  // Admin endpoints  declared BEFORE /:id to avoid Express capturing
  // "admin" as the orderId parameter.
  // ----------------------------------------------------------------

  @Get('admin/all')
  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPPORT', 'FINANCE')
  @UseGuards(RolesGuard)
  async getAllOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('userId') userId?: string,
  ) {
    return this.ordersService.getOrdersForAdmin(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      {
        status: status ? (status as OrderStatus) : undefined,
        search,
        userId,
      },
    );
  }

  @Get('admin/:id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPPORT', 'FINANCE')
  @UseGuards(RolesGuard)
  async getOrderForAdmin(@Param('id') orderId: string) {
    return this.ordersService.getOrderForAdmin(orderId);
  }

  @Post('admin/:id/status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  async updateStatus(
    @CurrentUser('id') adminId: string,
    @Param('id') orderId: string,
    @Body('status') status: string,
    @Body('reason') reason?: string,
  ) {
    return this.ordersService.updateStatus(orderId as any, status as any, {
      reason,
      actorId: adminId,
    });
  }

  // ----------------------------------------------------------------
  // User-scoped single-order lookup  after admin routes so
  // "admin" is never matched as an order id.
  // ----------------------------------------------------------------

  @Get(':id')
  async getOrder(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
  ) {
    return this.ordersService.getOrder(userId, orderId);
  }

  @Post(':id/cancel')
  async cancelOrder(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
  ) {
    return this.ordersService.cancelOrder(userId, orderId);
  }
}
