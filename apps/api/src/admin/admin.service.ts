import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/common/logger/logger.service';
import { AuditService } from '@/common/audit/audit.service';
import { OrderStatus, PricingRuleType, Prisma } from '@prisma/client';

export interface CreatePricingRuleDto {
  name: string;
  ruleType: PricingRuleType;
  targetType: string;
  targetId?: string;
  markupPercent: number;
  fixedAmount?: number;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
  priority?: number;
}

export interface UpdatePricingRuleDto {
  name?: string;
  markupPercent?: number;
  fixedAmount?: number;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
  priority?: number;
}

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private audit: AuditService,
  ) {}

  async getDashboardStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalRevenue,
      todayRevenue,
      monthRevenue,
      totalOrders,
      todayOrders,
      totalUsers,
      newUsersToday,
      totalProfit,
      walletLiability,
      pendingOrders,
      failedOrders,
      popularServices,
      bestCustomers,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: today } },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: thisMonth } },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { createdAt: { gte: today } } }),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.order.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { profit: true },
      }),
      this.prisma.wallet.aggregate({
        _sum: { balance: true },
      }),
      this.prisma.order.count({
        where: { status: { in: ['PENDING', 'PROCESSING'] } },
      }),
      this.prisma.order.count({
        where: { status: 'FAILED' },
      }),
      this.prisma.order.groupBy({
        by: ['serviceId'],
        where: { status: 'COMPLETED', createdAt: { gte: thisMonth } },
        _sum: { totalAmount: true, quantity: true },
        _count: { id: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 5,
      }),
      this.prisma.order.groupBy({
        by: ['userId'],
        where: { status: 'COMPLETED', createdAt: { gte: thisMonth } },
        _sum: { totalAmount: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 5,
      }),
    ]);

    // Get service names for popular services
    const popularServiceIds = popularServices.map(s => s.serviceId);
    const serviceNames = popularServiceIds.length > 0
      ? await this.prisma.service.findMany({
          where: { id: { in: popularServiceIds } },
          select: { id: true, name: true, category: true },
        })
      : [];

    const serviceNameMap = Object.fromEntries(serviceNames.map(s => [s.id, s]));

    // Get user names for best customers
    const customerIds = bestCustomers.map(c => c.userId);
    const customerNames = customerIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, email: true, firstName: true, lastName: true },
        })
      : [];

    const customerNameMap = Object.fromEntries(customerNames.map(c => [c.id, c]));

    return {
      revenue: {
        total: totalRevenue._sum.totalAmount || 0,
        today: todayRevenue._sum.totalAmount || 0,
        thisMonth: monthRevenue._sum.totalAmount || 0,
      },
      profit: totalProfit._sum.profit || 0,
      orders: {
        total: totalOrders,
        today: todayOrders,
        pending: pendingOrders,
        failed: failedOrders,
      },
      users: {
        total: totalUsers,
        newToday: newUsersToday,
      },
      walletLiability: walletLiability._sum.balance || 0,
      popularServices: popularServices.map(s => ({
        serviceId: s.serviceId,
        name: serviceNameMap[s.serviceId]?.name || 'Unknown',
        category: serviceNameMap[s.serviceId]?.category || 'Unknown',
        revenue: s._sum.totalAmount,
        quantity: s._sum.quantity,
        orders: s._count.id,
      })),
      bestCustomers: bestCustomers.map(c => ({
        userId: c.userId,
        email: customerNameMap[c.userId]?.email || 'Unknown',
        name: `${customerNameMap[c.userId]?.firstName || ''} ${customerNameMap[c.userId]?.lastName || ''}`.trim(),
        spent: c._sum.totalAmount,
      })),
    };
  }

  async getRevenueChart(period: 'daily' | 'weekly' | 'monthly' = 'daily', days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await this.prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        totalAmount: true,
        profit: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const grouped = new Map<string, { revenue: number; profit: number; orders: number }>();

    for (const order of orders) {
      const date = this.formatDateKey(order.createdAt, period);
      const existing = grouped.get(date) || { revenue: 0, profit: 0, orders: 0 };
      existing.revenue += order.totalAmount.toNumber();
      existing.profit += order.profit.toNumber();
      existing.orders += 1;
      grouped.set(date, existing);
    }

    return Array.from(grouped.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));
  }

  async getOrderTrends(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await this.prisma.order.groupBy({
      by: ['status'],
      where: { createdAt: { gte: startDate } },
      _count: { id: true },
    });

    return orders.map(o => ({
      status: o.status,
      count: o._count.id,
    }));
  }

  async getProviderPerformance() {
    const providers = await this.prisma.provider.findMany({
      include: {
        _count: {
          select: { services: true, orders: true },
        },
        orders: {
          where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
          select: { status: true, totalAmount: true, profit: true },
        },
      },
    });

    return providers.map(p => {
      const completed = p.orders.filter(o => o.status === 'COMPLETED');
      const failed = p.orders.filter(o => o.status === 'FAILED');
      const totalRevenue = completed.reduce((sum, o) => sum + o.totalAmount.toNumber(), 0);
      const totalProfit = completed.reduce((sum, o) => sum + o.profit.toNumber(), 0);

      return {
        id: p.id,
        name: p.name,
        displayName: p.displayName,
        status: p.status,
        lastSyncAt: p.lastSyncAt,
        avgResponseMs: p.avgResponseMs,
        consecutiveFailures: p.consecutiveFailures,
        serviceCount: p._count.services,
        orderCount: p._count.orders,
        completedOrders: completed.length,
        failedOrders: failed.length,
        successRate: p.orders.length > 0 ? (completed.length / p.orders.length) * 100 : 0,
        revenue: totalRevenue,
        profit: totalProfit,
      };
    });
  }

  async getAuditLogs(page = 1, limit = 50, filters?: { action?: string; userId?: string }) {
    const where: any = {};
    if (filters?.action) where.action = filters.action;
    if (filters?.userId) where.userId = filters.userId;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  }

  async createAuditLog(data: {
    userId?: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValue?: any;
    newValue?: any;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        ...data,
        oldValue: data.oldValue || {},
        newValue: data.newValue || {},
      },
    });
  }

  private formatDateKey(date: Date, period: string): string {
    const d = new Date(date);
    if (period === 'daily') {
      return d.toISOString().split('T')[0];
    }
    if (period === 'weekly') {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      return weekStart.toISOString().split('T')[0];
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  // ── Pricing rules ────────────────────────────────────────────────────────

  async listPricingRules() {
    return this.prisma.pricingRule.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createPricingRule(actorId: string, dto: CreatePricingRuleDto) {
    const rule = await this.prisma.pricingRule.create({
      data: {
        name: dto.name,
        ruleType: dto.ruleType,
        targetType: dto.targetType,
        targetId: dto.targetId ?? null,
        markupPercent: new Prisma.Decimal(dto.markupPercent),
        fixedAmount: dto.fixedAmount != null ? new Prisma.Decimal(dto.fixedAmount) : null,
        minPrice: dto.minPrice != null ? new Prisma.Decimal(dto.minPrice) : null,
        maxPrice: dto.maxPrice != null ? new Prisma.Decimal(dto.maxPrice) : null,
        isActive: dto.isActive ?? true,
        priority: dto.priority ?? 0,
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'pricing_rule.create',
      entityType: 'PricingRule',
      entityId: rule.id,
      newValue: { name: rule.name, ruleType: rule.ruleType, targetType: rule.targetType },
    });

    this.logger.log(`Pricing rule created: ${rule.id} (${rule.name}) by ${actorId}`, 'AdminService');
    return rule;
  }

  async updatePricingRule(actorId: string, id: string, dto: UpdatePricingRuleDto) {
    const existing = await this.prisma.pricingRule.findUniqueOrThrow({ where: { id } });

    const rule = await this.prisma.pricingRule.update({
      where: { id },
      data: {
        name: dto.name,
        markupPercent: dto.markupPercent != null ? new Prisma.Decimal(dto.markupPercent) : undefined,
        fixedAmount: dto.fixedAmount != null ? new Prisma.Decimal(dto.fixedAmount) : undefined,
        minPrice: dto.minPrice != null ? new Prisma.Decimal(dto.minPrice) : undefined,
        maxPrice: dto.maxPrice != null ? new Prisma.Decimal(dto.maxPrice) : undefined,
        isActive: dto.isActive,
        priority: dto.priority,
      },
    });

    await this.audit.record({
      userId: actorId,
      action: 'pricing_rule.update',
      entityType: 'PricingRule',
      entityId: id,
      oldValue: { isActive: existing.isActive, markupPercent: existing.markupPercent },
      newValue: { isActive: rule.isActive, markupPercent: rule.markupPercent },
    });

    return rule;
  }

  async deletePricingRule(actorId: string, id: string) {
    const existing = await this.prisma.pricingRule.findUniqueOrThrow({ where: { id } });

    await this.prisma.pricingRule.delete({ where: { id } });

    await this.audit.record({
      userId: actorId,
      action: 'pricing_rule.delete',
      entityType: 'PricingRule',
      entityId: id,
      oldValue: { name: existing.name, ruleType: existing.ruleType },
    });

    this.logger.log(`Pricing rule deleted: ${id} by ${actorId}`, 'AdminService');
  }
}
