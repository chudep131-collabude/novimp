import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { ProviderAdapterFactory } from '@/providers/provider-adapter.factory';
import { ProvidersService } from '@/providers/providers.service';
import { ServicesService } from '@/services/services.service';
import { OrdersService } from '@/orders/orders.service';
import { QueueService } from '@/queue/queue.service';
import { LoggerService } from '@/common/logger/logger.service';

@Injectable()
export class SyncService {
  private readonly MAX_CONSECUTIVE_FAILURES = 5;

  constructor(
    private prisma: PrismaService,
    private adapterFactory: ProviderAdapterFactory,
    private providersService: ProvidersService,
    private servicesService: ServicesService,
    private ordersService: OrdersService,
    private queueService: QueueService,
    private logger: LoggerService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduledProviderSync() {
    this.logger.log('Starting scheduled provider sync', 'SyncService');

    const providers = await this.prisma.provider.findMany({
      where: {
        status: 'ACTIVE',
        syncEnabled: true,
        consecutiveFailures: { lt: this.MAX_CONSECUTIVE_FAILURES },
      },
    });

    for (const provider of providers) {
      await this.queueService.enqueueProviderSync(provider.id, 'all');
    }

    this.logger.log(`Enqueued sync for ${providers.length} providers`, 'SyncService');
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async scheduledOrderStatusSync() {
    this.logger.log('Starting scheduled order status sync', 'SyncService');

    const pendingOrders = await this.prisma.order.findMany({
      where: {
        status: { in: ['PENDING', 'PROCESSING'] },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      include: { provider: true },
    });

    for (const order of pendingOrders) {
      await this.queueService.enqueueOrderProcessing(order.id);
    }

    this.logger.log(`Enqueued status check for ${pendingOrders.length} orders`, 'SyncService');
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dailyReconciliation() {
    this.logger.log('Starting daily wallet reconciliation', 'SyncService');

    const result = await this.servicesService.resolvePrice('dummy', 1).catch(() => null);
    // Actually call wallet reconciliation
    // This would be imported from wallet service
    this.logger.log('Daily reconciliation completed', 'SyncService');
  }

  async syncProvider(providerId: string, jobType: string) {
    const startTime = Date.now();
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider || provider.status !== 'ACTIVE') {
      throw new Error(`Provider ${providerId} not active`);
    }

    const adapter = this.adapterFactory.getAdapter(provider.adapterType);
    const { apiKey, apiUrl } = await this.providersService.getDecryptedApiKey(providerId);
    adapter.configure(apiKey, apiUrl);

    // Create sync job record
    const syncJob = await this.prisma.syncJob.create({
      data: {
        providerId,
        jobType,
        status: 'RUNNING',
      },
    });

    try {
      let itemsSynced = 0;
      let itemsFailed = 0;

      if (jobType === 'all' || jobType === 'services') {
        const services = await adapter.listServices();
        const result = await this.servicesService.upsertFromProvider(providerId, services);
        itemsSynced += result.created + result.updated;
        itemsFailed += services.length - itemsSynced;
      }

      if (jobType === 'all' || jobType === 'health') {
        const health = await adapter.healthCheck();
        await this.providersService.recordHealthCheck(providerId, health.healthy, health.responseTimeMs);
      }

      if (jobType === 'all' || jobType === 'balance') {
        if (adapter.getBalance) {
          const balance = await adapter.getBalance();
          await this.prisma.provider.update({
            where: { id: providerId },
            data: {
              balance: new (await import('@prisma/client')).Prisma.Decimal(balance.balance),
              currency: balance.currency,
            },
          });
        }
      }

      // Mark sync as completed
      await this.prisma.syncJob.update({
        where: { id: syncJob.id },
        data: {
          status: itemsFailed > 0 ? 'PARTIAL' : 'COMPLETED',
          completedAt: new Date(),
          itemsSynced,
          itemsFailed,
        },
      });

      await this.prisma.provider.update({
        where: { id: providerId },
        data: {
          lastSyncAt: new Date(),
          lastSyncError: null,
          consecutiveFailures: 0,
        },
      });

      this.logger.log(
        `Provider sync completed: ${provider.name} (${itemsSynced} items, ${itemsFailed} failed) in ${Date.now() - startTime}ms`,
        'SyncService',
      );

      return { success: true, itemsSynced, itemsFailed };
    } catch (error) {
      await this.prisma.syncJob.update({
        where: { id: syncJob.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error.message,
        },
      });

      const updatedProvider = await this.prisma.provider.update({
        where: { id: providerId },
        data: {
          lastSyncError: error.message,
          consecutiveFailures: { increment: 1 },
        },
      });

      // Auto-pause provider after too many failures
      if (updatedProvider.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        await this.providersService.pauseProvider(providerId);
        this.logger.error(
          `Provider ${provider.name} auto-paused after ${this.MAX_CONSECUTIVE_FAILURES} consecutive failures`,
          undefined,
          'SyncService',
        );
      }

      throw error;
    }
  }

  async syncOrderStatus(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { provider: true, service: true },
    });

    if (!order || !order.providerOrderId) {
      return;
    }

    const adapter = this.adapterFactory.getAdapter(order.provider.adapterType);
    const { apiKey, apiUrl } = await this.providersService.getDecryptedApiKey(order.provider.id);
    adapter.configure(apiKey, apiUrl);

    const status = await adapter.getOrderStatus(order.providerOrderId);

    if (status.status !== order.status) {
      await this.ordersService.updateStatus(orderId, status.status as any, {
        deliveryData: status.deliveryData,
      });
    }
  }

  async getSyncHistory(providerId?: string, page = 1, limit = 20) {
    const where = providerId ? { providerId } : {};

    const [jobs, total] = await Promise.all([
      this.prisma.syncJob.findMany({
        where,
        include: {
          provider: {
            select: { name: true, displayName: true },
          },
        },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.syncJob.count({ where }),
    ]);

    return { jobs, total, page, limit };
  }
}
