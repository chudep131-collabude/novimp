import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/common/logger/logger.service';
import { ServiceCategory, Prisma } from '@prisma/client';

import { ProvidersService } from '../providers/providers.service';
import { ProviderAdapterFactory } from '../providers/provider-adapter.factory';

@Injectable()
export class ServicesService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private providersService: ProvidersService,
    private adapterFactory: ProviderAdapterFactory,
  ) {}

  /**
   * List services from canonical catalog (customer-facing)
   * Never calls provider APIs directly
   */
  async listServices(filters: {
    category?: ServiceCategory;
    platform?: string;
    country?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = {
      isAvailable: true,
      inStock: true,
      status: 'ACTIVE',
    };

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.platform) {
      where.platform = { contains: filters.platform, mode: 'insensitive' };
    }

    if (filters.country) {
      where.countries = {
        path: ['$[*].code'],
        array_contains: filters.country,
      };
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const [services, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          platform: true,
          subcategory: true,
          customerPrice: true,
          customerMinQty: true,
          customerMaxQty: true,
          currency: true,
          estimatedTime: true,
          features: true,
          countries: true,
          inStock: true,
          stockQuantity: true,
          lastSyncedAt: true,
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.service.count({ where }),
    ]);

    // Flag stale data
    const now = new Date();
    const staleThreshold = 30 * 60 * 1000; // 30 minutes

    const enriched = services.map(svc => ({
      ...svc,
      _meta: {
        stale: svc.lastSyncedAt 
          ? (now.getTime() - new Date(svc.lastSyncedAt).getTime()) > staleThreshold
          : true,
      },
    }));

    return {
      services: enriched,
      total,
      page,
      limit,
    };
  }

  async getService(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id, isAvailable: true, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        platform: true,
        subcategory: true,
        customerPrice: true,
        customerMinQty: true,
        customerMaxQty: true,
        currency: true,
        estimatedTime: true,
        features: true,
        countries: true,
        inStock: true,
        stockQuantity: true,
        lastSyncedAt: true,
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  async getFreeNumbers(countryCode: string) {
    const provider = await this.prisma.provider.findFirst({
      where: { adapterType: 'onlinesim', status: 'ACTIVE' },
    });
    if (!provider) throw new NotFoundException('OnlineSIM provider not available');
    
    const { apiKey, apiUrl } = await this.providersService.getDecryptedApiKey(provider.id);
    const adapter = this.adapterFactory.getAdapter('onlinesim') as any;
    adapter.configure(apiKey, apiUrl);
    
    const numbers = await adapter.getFreeNumbers(countryCode);
    return { numbers };
  }

  async getFreeMessages(phone: string) {
    const provider = await this.prisma.provider.findFirst({
      where: { adapterType: 'onlinesim', status: 'ACTIVE' },
    });
    if (!provider) throw new NotFoundException('OnlineSIM provider not available');
    
    const { apiKey, apiUrl } = await this.providersService.getDecryptedApiKey(provider.id);
    const adapter = this.adapterFactory.getAdapter('onlinesim') as any;
    adapter.configure(apiKey, apiUrl);
    
    const messages = await adapter.getFreeMessages(phone);
    return { messages };
  }

  async getProxyTariffs(countryCode: string, proxyType: string, protocol: string) {
    if (!/^[A-Z]{2}$/i.test(countryCode)) {
      throw new NotFoundException('Invalid proxy country');
    }
    // ProxySeller types; legacy OnlineProxy types (private/shared) are not
    // supported for live tariff lookup — return empty so UI shows the message.
    if (!['mobile', 'ipv4', 'isp', 'ipv6'].includes(proxyType)) {
      return { tariffs: [], currency: 'USD' };
    }
    if (!['http', 'socks5'].includes(protocol)) {
      throw new NotFoundException('Invalid proxy protocol');
    }

    const provider = await this.prisma.provider.findFirst({
      where: { adapterType: 'proxyseller', status: 'ACTIVE' },
    });
    if (!provider) {
      // Provider not configured or paused — return empty so the UI shows
      // "No proxy offers match these options" rather than a 404 error banner.
      return { tariffs: [], currency: 'USD' };
    }

    const { apiKey, apiUrl } = await this.providersService.getDecryptedApiKey(provider.id);
    const adapter = this.adapterFactory.getAdapter('proxyseller');
    adapter.configure(apiKey, apiUrl);

    if (!adapter.getAvailableTariffs) {
      throw new NotFoundException('ProxySeller tariff lookup is not available');
    }

    const tariffs = await adapter.getAvailableTariffs({ countryCode, proxyType, protocol });
    return {
      tariffs: await Promise.all(tariffs.map(async (tariff) => ({
        period: tariff.period,
        price: (await this.calculateCustomerPrice(
          provider.id,
          ServiceCategory.PROXY,
          new Prisma.Decimal(tariff.price),
        )).toNumber(),
      }))),
      currency: 'USD',
    };
  }

  async getCategories() {
    const categories = await this.prisma.service.groupBy({
      by: ['category'],
      where: { isAvailable: true, status: 'ACTIVE' },
      _count: { id: true },
    });

    return categories.map(c => ({
      category: c.category,
      count: c._count.id,
    }));
  }

  async getPlatforms() {
    const platforms = await this.prisma.service.groupBy({
      by: ['platform'],
      where: { isAvailable: true, status: 'ACTIVE', platform: { not: null } },
      _count: { id: true },
    });

    return platforms.map(p => ({
      platform: p.platform,
      count: p._count.id,
    }));
  }

  /**
   * Pricing Engine: Resolve customer price server-side
   * Never trusts client input
   */
  async resolvePrice(serviceId: string, quantity: number): Promise<{
    unitPrice: number;
    totalPrice: number;
    currency: string;
  }> {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { provider: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Apply pricing rules in priority order
    const rules = await this.prisma.pricingRule.findMany({
      where: {
        isActive: true,
        OR: [
          { targetType: 'global' },
          { targetType: 'category', targetId: service.category },
          { targetType: 'service', targetId: service.id },
          { targetType: 'provider', targetId: service.providerId },
        ],
      },
      orderBy: { priority: 'desc' },
    });

    let unitPrice = service.providerPrice;

    // Apply most specific rule
    for (const rule of rules) {
      if (rule.ruleType === 'OVERRIDE' && rule.fixedAmount) {
        unitPrice = rule.fixedAmount;
        break;
      }
      if (rule.ruleType === 'MARKUP_PERCENT' && rule.markupPercent) {
        unitPrice = unitPrice.mul(rule.markupPercent.div(100).add(1));
      }
      if (rule.ruleType === 'MARKUP_FIXED' && rule.fixedAmount) {
        unitPrice = unitPrice.add(rule.fixedAmount);
      }
      if (rule.minPrice && unitPrice.lessThan(rule.minPrice)) {
        unitPrice = rule.minPrice;
      }
      if (rule.maxPrice && unitPrice.greaterThan(rule.maxPrice)) {
        unitPrice = rule.maxPrice;
      }
    }

    // Apply default markup if no rules matched
    if (rules.length === 0) {
      const defaultMarkup: Record<string, number> = {
        SMM: 2.5,
        PROXY: 1.5,
        NUMBER: 1.5,
        ESIM: 1.5,
      };
      const markup = defaultMarkup[service.category] || 1.5;
      unitPrice = unitPrice.mul(markup);
    }

    const totalPrice = unitPrice.mul(quantity);

    return {
      unitPrice: unitPrice.toNumber(),
      totalPrice: totalPrice.toNumber(),
      currency: service.currency,
    };
  }

  /**
   * Admin: Update service (pricing override, availability)
   */
  async updateService(id: string, data: {
    priceOverride?: number;
    markupPercent?: number;
    isAvailable?: boolean;
    inStock?: boolean;
    stockQuantity?: number;
  }) {
    const service = await this.prisma.service.update({
      where: { id },
      data: {
        priceOverride: data.priceOverride ? new Prisma.Decimal(data.priceOverride) : undefined,
        markupPercent: data.markupPercent ? new Prisma.Decimal(data.markupPercent) : undefined,
        isAvailable: data.isAvailable,
        inStock: data.inStock,
        stockQuantity: data.stockQuantity,
      },
    });

    this.logger.log(`Service updated: ${service.name}`, 'ServicesService');
    return service;
  }

  /**
   * Admin: Upsert services from provider sync
   */
  async upsertFromProvider(providerId: string, services: Array<{
    externalId: string;
    name: string;
    description?: string;
    category: string;
    platform?: string;
    subcategory?: string;
    price: number;
    minQty: number;
    maxQty?: number;
    currency: string;
    available: boolean;
    inStock: boolean;
    stockQty?: number;
    countries?: any[];
    features?: any;
    estimatedTime?: string;
  }>) {
    const results = { created: 0, updated: 0, unchanged: 0 };

    // Process in parallel batches of 50 to avoid overwhelming the DB
    // while still being dramatically faster than one-by-one
    const BATCH_SIZE = 50;
    for (let i = 0; i < services.length; i += BATCH_SIZE) {
      const batch = services.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (svc) => {
        const customerPrice = await this.calculateCustomerPrice(
          providerId,
          svc.category as ServiceCategory,
          new Prisma.Decimal(svc.price),
        );

        const data = {
          name: svc.name,
          description: svc.description,
          category: svc.category as ServiceCategory,
          platform: svc.platform,
          subcategory: svc.subcategory,
          providerPrice: new Prisma.Decimal(svc.price),
          providerMinQty: svc.minQty,
          providerMaxQty: svc.maxQty,
          providerCurrency: svc.currency,
          customerPrice,
          customerMinQty: svc.minQty,
          customerMaxQty: svc.maxQty,
          isAvailable: svc.available,
          inStock: svc.inStock,
          stockQuantity: svc.stockQty,
          countries: svc.countries,
          features: svc.features,
          estimatedTime: svc.estimatedTime,
          lastSyncedAt: new Date(),
        };

        const result = await this.prisma.service.upsert({
          where: {
            providerId_externalId: { providerId, externalId: svc.externalId },
          },
          create: { providerId, externalId: svc.externalId, ...data },
          update: data,
        });

        // Prisma upsert doesn't tell us if it created or updated,
        // so we check by comparing createdAt vs updatedAt
        if (result.createdAt.getTime() === result.updatedAt.getTime()) {
          results.created++;
        } else {
          results.updated++;
        }
      }));
    }

    return results;
  }

  async calculateCustomerPrice(
    providerId: string,
    category: ServiceCategory,
    providerPrice: Prisma.Decimal,
  ): Promise<Prisma.Decimal> {
    const rules = await this.prisma.pricingRule.findMany({
      where: {
        isActive: true,
        OR: [
          { targetType: 'global' },
          { targetType: 'category', targetId: category },
          { targetType: 'provider', targetId: providerId },
        ],
      },
      orderBy: { priority: 'desc' },
    });

    let price = providerPrice;

    for (const rule of rules) {
      if (rule.ruleType === 'OVERRIDE' && rule.fixedAmount) {
        price = rule.fixedAmount;
        break;
      }
      if (rule.ruleType === 'MARKUP_PERCENT' && rule.markupPercent) {
        price = price.mul(rule.markupPercent.div(100).add(1));
      }
      if (rule.ruleType === 'MARKUP_FIXED' && rule.fixedAmount) {
        price = price.add(rule.fixedAmount);
      }
    }

    if (rules.length === 0) {
      const defaultMarkup: Record<string, number> = {
        SMM: 2.5,
        PROXY: 1.5,
        NUMBER: 1.5,
        ESIM: 1.5,
      };
      price = price.mul(defaultMarkup[category] || 1.5);
    }

    return price;
  }

  /* ────────────────────────────────────────────────────────────────────────
   * Temporary email via mail.tm (no API key required)
   * Docs: https://api.mail.tm
   * ──────────────────────────────────────────────────────────────────────── */

  private readonly MAILTM_BASE = 'https://api.mail.tm';

  /** List available @domain options for address creation. */
  async getEmailDomains(): Promise<{ domains: Array<{ id: string; domain: string }> }> {
    const res = await fetch(`${this.MAILTM_BASE}/domains?page=1`);
    if (!res.ok) throw new Error(`mail.tm domains error: ${res.status}`);
    const data = await res.json();
    const domains = (data['hydra:member'] ?? []).map((d: any) => ({
      id: d.id,
      domain: d.domain,
    }));
    return { domains };
  }

  /**
   * Create a new temporary mailbox.
   * Returns { address, token } token must be stored client-side to poll inbox.
   */
  async createEmailAccount(address: string, password: string): Promise<{
    id: string;
    address: string;
    token: string;
  }> {
    // 1. Register the account
    const reg = await fetch(`${this.MAILTM_BASE}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, password }),
    });
    if (!reg.ok) {
      const err = await reg.json().catch(() => ({}));
      throw new Error(err['hydra:description'] ?? `Registration failed: ${reg.status}`);
    }
    const account = await reg.json();

    // 2. Authenticate to get the JWT token
    const auth = await fetch(`${this.MAILTM_BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, password }),
    });
    if (!auth.ok) throw new Error(`Auth failed: ${auth.status}`);
    const { token } = await auth.json();

    return { id: account.id, address: account.address, token };
  }

  /** Fetch all messages in a mailbox (requires the account JWT token). */
  async getEmailInbox(address: string, token: string): Promise<{
    messages: Array<{
      id: string;
      from: { address: string; name: string };
      subject: string;
      intro: string;
      seen: boolean;
      createdAt: string;
    }>;
  }> {
    const res = await fetch(`${this.MAILTM_BASE}/messages?page=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Inbox fetch failed: ${res.status}`);
    const data = await res.json();
    const messages = (data['hydra:member'] ?? []).map((m: any) => ({
      id: m.id,
      from: m.from,
      subject: m.subject,
      intro: m.intro,
      seen: m.seen,
      createdAt: m.createdAt,
    }));
    return { messages };
  }

  /** Fetch the full body of a single message. */
  async getEmailMessage(id: string, token: string): Promise<{
    id: string;
    from: { address: string; name: string };
    subject: string;
    text: string;
    html: string[];
    createdAt: string;
  }> {
    const res = await fetch(`${this.MAILTM_BASE}/messages/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Message fetch failed: ${res.status}`);
    const m = await res.json();
    return {
      id: m.id,
      from: m.from,
      subject: m.subject,
      text: m.text ?? '',
      html: m.html ?? [],
      createdAt: m.createdAt,
    };
  }
}
