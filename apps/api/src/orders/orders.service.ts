import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { WalletService } from '@/wallet/wallet.service';
import { ProviderAdapterFactory } from '@/providers/provider-adapter.factory';
import { ProvidersService } from '@/providers/providers.service';
import { ServicesService } from '@/services/services.service';
import { LoggerService } from '@/common/logger/logger.service';
import { AuditService } from '@/common/audit/audit.service';
import { TelegramService } from '@/telegram/telegram.service';
import { OrderStatus, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// Explicit state machine transitions
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'],
  PROCESSING: ['COMPLETED', 'FAILED', 'CANCELLED', 'PARTIAL'],
  COMPLETED: ['REFUNDED'],
  FAILED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
  PARTIAL: ['COMPLETED', 'REFUNDED'],
};

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private adapterFactory: ProviderAdapterFactory,
    private providersService: ProvidersService,
    private servicesService: ServicesService,
    private logger: LoggerService,
    private audit: AuditService,
    private telegram: TelegramService,
  ) {}

  async createOrder(
    userId: string,
    serviceId: string,
    quantity: number,
    options: {
      targetUrl?: string;
      targetUsername?: string;
      customData?: any;
      idempotencyKey?: string;
    } = {},
  ) {
    const idempotencyKey = options.idempotencyKey || uuidv4();

    // Check for duplicate
    const existing = await this.prisma.order.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      this.logger.warn(`Duplicate order detected: ${idempotencyKey}`, 'OrdersService');
      return existing;
    }

    // Get service with current pricing from canonical catalog
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { provider: true },
    });

    if (!service || !service.isAvailable || !service.inStock) {
      throw new BadRequestException('Service not available');
    }

    if (quantity < service.customerMinQty) {
      throw new BadRequestException(`Minimum quantity is ${service.customerMinQty}`);
    }
    if (service.customerMaxQty && quantity > service.customerMaxQty) {
      throw new BadRequestException(`Maximum quantity is ${service.customerMaxQty}`);
    }

    const adapter = this.adapterFactory.getAdapter(service.provider.adapterType);
    let providerUnitPrice = service.providerPrice;
    let exactProviderQuote: string | undefined;
    let unitPrice = service.priceOverride || service.customerPrice;

    if (adapter.getOrderQuote) {
      const { apiKey, apiUrl } = await this.providersService.getDecryptedApiKey(service.providerId);
      adapter.configure(apiKey, apiUrl);
      const quote = await adapter.getOrderQuote({
        serviceId: service.externalId,
        quantity,
        customData: options.customData,
      });
      exactProviderQuote = quote.price;
      providerUnitPrice = new Prisma.Decimal(quote.price);
      unitPrice = service.priceOverride || await this.servicesService.calculateCustomerPrice(
        service.providerId,
        service.category,
        providerUnitPrice,
      );
    }

    // Calculate price server-side (never trust client)
    const totalAmount = unitPrice.mul(quantity);
    const providerCost = providerUnitPrice.mul(quantity);
    const profit = totalAmount.sub(providerCost);

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create order and debit wallet in single transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Debit wallet first
      const walletTx = await this.walletService.debit(userId, totalAmount.toNumber(), {
        description: `Order ${orderNumber}`,
        referenceType: 'order',
        referenceId: orderNumber,
        idempotencyKey: `wallet-${idempotencyKey}`,
        metadata: { serviceId, quantity },
      });

      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          serviceId,
          providerId: service.providerId,
          quantity,
          providerCost,
          customerPrice: unitPrice,
          totalAmount,
          profit,
          targetUrl: options.targetUrl,
          targetUsername: options.targetUsername,
          customData: options.customData || {},
          status: 'PENDING',
          statusHistory: [{ status: 'PENDING', at: new Date().toISOString() }],
          idempotencyKey,
        },
      });

      return newOrder;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 15000,
    });

    const fulfilledOrder = await this.fulfillProviderOrder(order.id, exactProviderQuote);

    this.logger.log(
      `Order created: ${orderNumber} for user ${userId}, amount ${totalAmount}`,
      'OrdersService',
    );

    return fulfilledOrder;
  }

  async getOrders(userId: string, page = 1, limit = 20, search?: string) {
    const where: Prisma.OrderWhereInput = { userId };

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { service: { name: { contains: q, mode: 'insensitive' } } },
        { service: { platform: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          service: {
            select: {
              name: true,
              category: true,
              platform: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders, total, page, limit };
  }

  async getOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        service: {
          select: {
            name: true,
            category: true,
            platform: true,
            description: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /**
   * Admin / staff-scoped order listing across ALL users.
   * Supports pagination, free-text search, status and user filters.
   * Returns a per-status breakdown so the console can render tabs with counts.
   */
  async getOrdersForAdmin(
    page = 1,
    limit = 20,
    filters: { status?: OrderStatus; search?: string; userId?: string } = {},
  ) {
    const { status, search, userId } = filters;
    const where: Prisma.OrderWhereInput = {};

    if (status) where.status = status;
    if (userId) where.userId = userId;

    const term = search?.trim();
    if (term) {
      where.OR = [
        { orderNumber: { contains: term, mode: 'insensitive' } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
        { service: { name: { contains: term, mode: 'insensitive' } } },
        { service: { platform: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          service: {
            select: { name: true, category: true, platform: true },
          },
          provider: {
            select: { displayName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    // Status breakdown for the current scope (search/user filters, not status).
    const countsWhere: Prisma.OrderWhereInput = {};
    if (userId) countsWhere.userId = userId;
    if (term) {
      countsWhere.OR = [
        { orderNumber: { contains: term, mode: 'insensitive' } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
        { service: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const grouped = await this.prisma.order.groupBy({
      by: ['status'],
      where: countsWhere,
      _count: { id: true },
    });

    const statusCounts = grouped.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count.id;
      return acc;
    }, {});

    return { orders, total, page, limit, statusCounts };
  }

  /** Admin-scoped single order lookup (no ownership restriction). */
  async getOrderForAdmin(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        service: {
          select: {
            name: true,
            category: true,
            platform: true,
            description: true,
          },
        },
        provider: {
          select: { displayName: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateStatus(
    orderId: string,
    newStatus: OrderStatus,
    options: {
      reason?: string;
      deliveryData?: any;
      providerOrderId?: string;
      /** Staff user performing the change (for the audit trail). */
      actorId?: string;
    } = {},
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Validate state transition
    const validNext = VALID_TRANSITIONS[order.status];
    if (!validNext.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition: ${order.status} -> ${newStatus}`,
      );
    }

    const statusHistory = (order.statusHistory as any[]) || [];
    statusHistory.push({
      status: newStatus,
      at: new Date().toISOString(),
      reason: options.reason,
    });

    const updateData: any = {
      status: newStatus,
      statusHistory,
    };

    if (newStatus === 'PROCESSING') {
      updateData.startedAt = new Date();
    }
    if (newStatus === 'COMPLETED') {
      updateData.completedAt = new Date();
      updateData.deliveryData = options.deliveryData;
    }
    if (newStatus === 'FAILED' || newStatus === 'CANCELLED') {
      updateData.cancelledAt = new Date();
    }
    if (newStatus === 'REFUNDED') {
      updateData.refundedAt = new Date();
      updateData.refundAmount = order.totalAmount;
    }
    if (options.providerOrderId) {
      updateData.providerOrderId = options.providerOrderId;
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    // Handle refunds.
    // NOTE: FAILED is intentionally excluded the wallet debit and order creation
    // happen inside a single serializable transaction, so if the order creation failed
    // the debit was never committed. Only CANCELLED (user/admin request) and
    // REFUNDED (explicit refund flow) should trigger a wallet credit.
    if (newStatus === 'CANCELLED' || newStatus === 'REFUNDED') {
      await this.walletService.refund(order.userId, order.totalAmount.toNumber(), {
        description: `Refund for order ${order.orderNumber}`,
        referenceId: order.id,
        idempotencyKey: `refund-${order.idempotencyKey}`,
      });
    }

    this.logger.log(
      `Order ${order.orderNumber} status: ${order.status} -> ${newStatus}`,
      'OrdersService',
    );

    if (options.actorId) {
      await this.audit.record({
        userId: options.actorId,
        action: 'order.status_update',
        entityType: 'order',
        entityId: order.id,
        oldValue: { status: order.status },
        newValue: { status: newStatus },
        reason: options.reason,
      });
    }

    // Fire-and-forget Telegram notification for terminal states
    const NOTIFY_STATUSES: OrderStatus[] = ['COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIAL'];
    if (NOTIFY_STATUSES.includes(newStatus)) {
      this.notifyOrderStatus(order.userId, order.orderNumber, newStatus).catch((err) =>
        this.logger.warn(`Telegram notification failed: ${err.message}`, 'OrdersService'),
      );
    }

    return updated;
  }

  private async notifyOrderStatus(userId: string, orderNumber: string, status: OrderStatus) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true },
    });
    if (!user?.telegramId) return;

    const EMOJI_MAP: Partial<Record<OrderStatus, string>> = {
      COMPLETED: '✅',
      FAILED: '❌',
      CANCELLED: '🚫',
      REFUNDED: '💸',
      PARTIAL: '⚠️',
    };

    const LABEL_MAP: Partial<Record<OrderStatus, string>> = {
      COMPLETED: 'completed successfully',
      FAILED: 'failed',
      CANCELLED: 'was cancelled',
      REFUNDED: 'has been refunded',
      PARTIAL: 'was partially fulfilled',
    };

    const emoji = EMOJI_MAP[status] ?? 'ℹ️';
    const label = LABEL_MAP[status] ?? `updated to ${status}`;

    await this.telegram.sendMessage(
      user.telegramId,
      `${emoji} <b>Order ${orderNumber}</b> ${label}.\n\n` +
        `Open the app to view details.`,
    );
  }

  async getOrderStats(userId?: string) {
    const where = userId ? { userId } : {};

    const [total, completed, failed, pending, revenue] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.order.count({ where: { ...where, status: 'FAILED' } }),
      this.prisma.order.count({ where: { ...where, status: { in: ['PENDING', 'PROCESSING'] } } }),
      this.prisma.order.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      total,
      completed,
      failed,
      pending,
      revenue: revenue._sum.totalAmount || 0,
    };
  }

  private async fulfillProviderOrder(orderId: string, expectedProviderCost?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { provider: true, service: true },
    });
    if (!order || order.provider.adapterType.toLowerCase() !== 'onlineproxy') return order;

    const adapter = this.adapterFactory.getAdapter(order.provider.adapterType);
    const { apiKey, apiUrl } = await this.providersService.getDecryptedApiKey(order.providerId);
    adapter.configure(apiKey, apiUrl);

    try {
      const result = await adapter.createOrder({
        serviceId: order.service.externalId,
        quantity: order.quantity,
        targetUrl: order.targetUrl ?? undefined,
        targetUsername: order.targetUsername ?? undefined,
        customData: {
          ...(order.customData as Record<string, unknown>),
          ...(expectedProviderCost ? { _providerQuotedCost: expectedProviderCost } : {}),
        },
      });

      return this.updateStatus(order.id, 'COMPLETED', {
        providerOrderId: result.providerOrderId,
        deliveryData: result.deliveryData,
      });
    } catch (error) {
      const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
        ? Number((error as { statusCode: unknown }).statusCode)
        : null;

      if (statusCode === null || statusCode < 400 || statusCode >= 500) {
        this.logger.error(
          `OnlineProxy purchase outcome is uncertain for order ${order.orderNumber}; leaving it pending for reconciliation`,
          error instanceof Error ? error.message : String(error),
          'OrdersService',
        );
        return this.prisma.order.findUnique({ where: { id: order.id } });
      }

      await this.updateStatus(order.id, 'FAILED', {
        reason: error instanceof Error ? error.message : String(error),
      });
      await this.walletService.refund(order.userId, order.totalAmount.toNumber(), {
        description: `Refund for failed order ${order.orderNumber}`,
        referenceId: order.id,
        idempotencyKey: `provider-failure-refund-${order.idempotencyKey}`,
      });
      return this.prisma.order.findUnique({ where: { id: order.id } });
    }
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, userId },
      include: { service: { include: { provider: true } } },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'PENDING' && order.status !== 'PROCESSING') {
      throw new BadRequestException('Order cannot be cancelled in its current state');
    }

    if (order.providerOrderId && order.service.provider) {
      const adapter = this.adapterFactory.getAdapter(order.service.provider.adapter);
      try {
        const cancelled = await adapter.cancelOrder(order.providerOrderId);
        if (!cancelled) {
          throw new BadRequestException('Provider rejected cancellation. Service might have already started.');
        }
      } catch (error) {
        if (error instanceof BadRequestException) throw error;
        this.logger.error(`Failed to cancel order ${order.orderNumber} with provider`, error instanceof Error ? error.stack : String(error), 'OrdersService');
        throw new BadRequestException('Failed to cancel order with provider. Service might have already started.');
      }
    }

    return this.updateStatus(order.id, 'CANCELLED', {
      reason: 'Cancelled by user',
      actorId: userId,
    });
  }
}
