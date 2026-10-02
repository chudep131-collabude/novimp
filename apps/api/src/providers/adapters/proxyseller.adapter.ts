import { Injectable } from '@nestjs/common';
import {
  ProviderAdapter,
  ProviderOrderRequest,
  ProviderOrderResponse,
  ProviderOrderStatus,
  ProviderService,
} from '../interfaces/provider-adapter.interface';

/**
 * ProxySeller adapter
 * Docs: https://docs.proxy-seller.com/proxy-seller/order-actions
 *
 * API key lives in the URL path no Authorization header needed.
 * Base URL pattern: https://proxy-seller.com/personal/api/v1/{apiKey}/
 *
 * Supported proxy types mapped to our catalog:
 *   mobile   → category PROXY, subcategory "mobile"
 *   ipv4     → category PROXY, subcategory "ipv4"
 *   isp      → category PROXY, subcategory "isp"
 *   ipv6     → category PROXY, subcategory "ipv6"
 */

const PROXYSELLER_BASE = 'https://proxy-seller.com/personal/api/v1';

/** paymentId 1 = account balance (always used we top up externally) */
const PAYMENT_ID_BALANCE = 1;

/** Proxy types we expose to customers */
const CATALOG_TYPES = ['mobile', 'ipv4', 'isp', 'ipv6'] as const;
type ProxySellerType = typeof CATALOG_TYPES[number];

interface ReferenceCountry {
  id: number;
  name: string;
  code: string; // ISO alpha-2
  alpha3?: string; // ISO alpha-3 as returned by API
}

interface ReferencePeriod {
  id: string;
  name: string;
  days: number;
  price: number;
}

interface ReferenceOperator {
  id: string;
  name: string;
}

interface ReferenceRotation {
  id: number;
  name: string;
}

interface ReferenceData {
  countries: ReferenceCountry[];
  periods: ReferencePeriod[];
  operators?: ReferenceOperator[];
  rotations?: ReferenceRotation[];
}

interface ProxySellerProxy {
  id: string;
  orderId: string;
  orderNumber: string;
  ip: string;
  host: string;
  port: number;
  user: string;
  pass: string;
  protocol: string;
  country: string;
  countryCode: string;
  operator?: string;
  expiresAt: string;
  status: string;
}

interface ProxySellerOrderResult {
  orderId: string;
  orderNumber: string;
  proxies: ProxySellerProxy[];
  errors?: string[];
}

class ProxySellerApiError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly errors: string[] = [],
  ) {
    super(message);
    this.name = 'ProxySellerApiError';
  }
}

@Injectable()
export class ProxySellerAdapter implements ProviderAdapter {
  readonly name = 'ProxySeller';
  private apiKey = '';
  private baseUrl = PROXYSELLER_BASE;

  configure(apiKey: string, _baseUrl: string): void {
    this.apiKey = apiKey.trim();
    // baseUrl is ignored ProxySeller always uses its own URL
  }

  // ─── ProviderAdapter interface ──────────────────────────────────────────────

  async healthCheck(): Promise<{ healthy: boolean; responseTimeMs: number; message?: string }> {
    const start = Date.now();
    try {
      await this.get<{ balance: number }>('balance/get');
      return { healthy: true, responseTimeMs: Date.now() - start };
    } catch (error) {
      return {
        healthy: false,
        responseTimeMs: Date.now() - start,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async listServices(): Promise<ProviderService[]> {
    const services: ProviderService[] = [];

    for (const type of CATALOG_TYPES) {
      try {
        const ref = await this.getReference(type);
        const typeServices = this.buildServicesFromReference(type, ref);
        services.push(...typeServices);
      } catch (error) {
        // One failing type shouldn't block others
        continue;
      }
    }

    return services;
  }

  async getServiceDetails(externalId: string): Promise<ProviderService | null> {
    const all = await this.listServices();
    return all.find((s) => s.externalId === externalId) ?? null;
  }

  async checkAvailability(serviceId: string, quantity: number): Promise<boolean> {
    const service = await this.getServiceDetails(serviceId);
    return service !== null && service.available && quantity >= 1;
  }

  async getOrderQuote(
    request: ProviderOrderRequest,
  ): Promise<{ price: string; currency: string }> {
    const params = this.extractOrderParams(request);
    const body = this.buildOrderBody(params);
    const result = await this.post<{ total?: number; price?: number; errors?: string[] }>(
      'order/calc',
      body,
    );
    if (result.errors?.length) {
      throw new ProxySellerApiError(400, `ProxySeller calc error: ${result.errors.join(', ')}`, result.errors);
    }
    const price = result.total ?? result.price ?? 0;
    return { price: String(price), currency: 'USD' };
  }

  async createOrder(request: ProviderOrderRequest): Promise<ProviderOrderResponse> {
    const params = this.extractOrderParams(request);
    const body = this.buildOrderBody(params);
    const result = await this.post<ProxySellerOrderResult>('order/make', body);

    if (result.errors?.length) {
      throw new ProxySellerApiError(400, `ProxySeller order error: ${result.errors.join(', ')}`, result.errors);
    }

    const proxy = result.proxies?.[0];
    if (!proxy) {
      throw new ProxySellerApiError(500, 'ProxySeller returned no proxy after order');
    }

    return {
      providerOrderId: result.orderNumber,
      status: 'COMPLETED',
      deliveryData: this.toDeliveryData(proxy),
    };
  }

  async getOrderStatus(providerOrderId: string): Promise<ProviderOrderStatus> {
    // ProxySeller proxies are delivered immediately on purchase.
    // Use the orderNumber to look up the active proxy.
    const result = await this.get<{ data?: ProxySellerProxy[] }>(
      `proxy/list?orderNumber=${encodeURIComponent(providerOrderId)}`,
    );
    const proxies = result.data ?? (result as any);
    const list: ProxySellerProxy[] = Array.isArray(proxies) ? proxies : [];

    if (list.length === 0) {
      return { status: 'FAILED', completed: 0, total: 1, errorMessage: 'Proxy not found' };
    }

    const proxy = list[0];
    const expired = proxy.expiresAt ? Date.parse(proxy.expiresAt) < Date.now() : false;
    const status = expired ? 'CANCELLED' : 'COMPLETED';

    return {
      status,
      completed: 1,
      total: 1,
      deliveryData: this.toDeliveryData(proxy),
    };
  }

  async cancelOrder(_providerOrderId: string): Promise<boolean> {
    // ProxySeller does not support cancellation via API
    return false;
  }

  async getBalance(): Promise<{ balance: number; currency: string }> {
    const result = await this.get<{ balance?: number | string }>('balance/get');
    const balance = Number(result.balance ?? 0);
    if (!Number.isFinite(balance)) throw new ProxySellerApiError(500, 'ProxySeller returned invalid balance');
    return { balance, currency: 'USD' };
  }

  async getAvailableTariffs(filters: {
    countryCode: string;
    proxyType: string;
    protocol: string;
  }): Promise<Array<{ period: number; price: number }>> {
    const type = this.mapSubcategoryToType(filters.proxyType);
    const ref = await this.getReference(type);

    // Find country by alpha-2 code
    const country = ref.countries.find(
      (c) => c.code?.toUpperCase() === filters.countryCode.toUpperCase(),
    );
    if (!country) return [];

    // Fetch price for each period via order/calc
    const results = await Promise.all(
      ref.periods.map(async (p) => {
        try {
          const proto = (filters.protocol ?? 'http').toUpperCase();
          const body: Record<string, unknown> = {
            countryId: country.id,
            periodId: p.id,
            quantity: 1,
            paymentId: PAYMENT_ID_BALANCE,
            // Required by ProxySeller for IPv4/ISP/mobile — use a generic value
            // so the calc endpoint doesn't reject with "Set [customTargetName]"
            customTargetName: 'Other',
          };
          if (type === 'mobile') {
            body.mobileServiceType = 'dedicated';
            body.protocol = proto;
          } else if (type === 'ipv4' || type === 'isp') {
            body.protocol = proto;
          }

          const result = await this.post<{ total?: number; price?: number; errors?: string[] }>(
            'order/calc',
            body,
          );
          const price = result.total ?? result.price ?? 0;
          if (price <= 0) return null;
          return { period: p.days, price };
        } catch {
          return null;
        }
      }),
    );

    return results
      .filter((r): r is { period: number; price: number } => r !== null)
      .sort((a, b) => a.period - b.period);
  }

  // ─── Reference data ─────────────────────────────────────────────────────────

  private async getReference(type: ProxySellerType): Promise<ReferenceData> {
    const raw = await this.get<any>(`reference/list/${type}`);

    // Real response shape: { status, data: { items: { country: [...], period: [...] } }, errors }
    const items = raw?.items ?? raw?.data?.items ?? raw;

    const rawCountries: any[] = items?.country ?? items?.countries ?? [];
    const rawPeriods: any[] = items?.period ?? items?.periods ?? [];

    // Countries use alpha3 (3-letter) codes convert to alpha2 via lookup
    const countries: ReferenceCountry[] = rawCountries.map((c: any) => ({
      id: c.id,
      name: c.name ?? '',
      code: this.alpha3ToAlpha2(c.alpha3 ?? c.code ?? ''),
      alpha3: c.alpha3 ?? '',
    }));

    // Periods have string IDs like "1w", "1m" convert to days
    const periods: ReferencePeriod[] = rawPeriods
      .map((p: any) => ({
        id: String(p.id),
        name: p.name ?? String(p.id),
        days: this.periodIdToDays(String(p.id)),
        price: 0, // Price comes from order/calc, not reference
      }))
      .filter((p) => p.days > 0);

    // Operators are nested per-country per mobile type; flatten to a unique list
    const operatorMap = new Map<string, ReferenceOperator>();
    for (const country of rawCountries) {
      const dedicated: any[] = country.operators?.dedicated ?? [];
      const shared: any[] = country.operators?.shared ?? [];
      for (const op of [...dedicated, ...shared]) {
        if (op.id && !operatorMap.has(op.id)) {
          operatorMap.set(op.id, { id: String(op.id), name: op.name ?? String(op.id) });
        }
      }
    }
    const operators = Array.from(operatorMap.values());

    // Rotations also nested per operator flatten to unique list
    const rotationMap = new Map<number, ReferenceRotation>();
    for (const country of rawCountries) {
      const allOps = [
        ...(country.operators?.dedicated ?? []),
        ...(country.operators?.shared ?? []),
      ];
      for (const op of allOps) {
        for (const rot of op.rotations ?? []) {
          if (!rotationMap.has(rot.id)) {
            rotationMap.set(rot.id, { id: rot.id, name: rot.name ?? String(rot.id) });
          }
        }
      }
    }
    const rotations = Array.from(rotationMap.values());

    return { countries, periods, operators, rotations };
  }

  /** Convert ISO alpha-3 to alpha-2. Covers the countries ProxySeller offers. */
  private alpha3ToAlpha2(alpha3: string): string {
    const map: Record<string, string> = {
      USA: 'US', GBR: 'GB', DEU: 'DE', FRA: 'FR', ITA: 'IT', ESP: 'ES',
      NLD: 'NL', POL: 'PL', ROU: 'RO', UKR: 'UA', TUR: 'TR', BRA: 'BR',
      IND: 'IN', IDN: 'ID', THA: 'TH', SGP: 'SG', MYS: 'MY', PHL: 'PH',
      VNM: 'VN', BGD: 'BD', PAK: 'PK', KAZ: 'KZ', UZB: 'UZ', AZE: 'AZ',
      ARM: 'AM', GEO: 'GE', LVA: 'LV', LTU: 'LT', EST: 'EE', FIN: 'FI',
      SWE: 'SE', NOR: 'NO', DNK: 'DK', CZE: 'CZ', SVK: 'SK', HUN: 'HU',
      BGR: 'BG', SRB: 'RS', HRV: 'HR', SVN: 'SI', MDA: 'MD', BLR: 'BY',
      MKD: 'MK', ALB: 'AL', BIH: 'BA', GRC: 'GR', PRT: 'PT', BEL: 'BE',
      CHE: 'CH', AUT: 'AT', CAN: 'CA', MEX: 'MX', ARG: 'AR', CHL: 'CL',
      COL: 'CO', PER: 'PE', VEN: 'VE', URY: 'UY', ECU: 'EC', BOL: 'BO',
      PRY: 'PY', ZAF: 'ZA', NGA: 'NG', KEN: 'KE', GHA: 'GH', EGY: 'EG',
      MAR: 'MA', TUN: 'TN', DZA: 'DZ', ISR: 'IL', SAU: 'SA', ARE: 'AE',
      QAT: 'QA', KWT: 'KW', JOR: 'JO', LBN: 'LB', IRQ: 'IQ', IRN: 'IR',
      JPN: 'JP', KOR: 'KR', CHN: 'CN', TWN: 'TW', HKG: 'HK', MNG: 'MN',
      AUS: 'AU', NZL: 'NZ', CYP: 'CY', MLT: 'MT', ISL: 'IS', IRL: 'IE',
      LUX: 'LU', AND: 'AD', MCO: 'MC', LIE: 'LI', SMR: 'SM', VAT: 'VA',
      KGZ: 'KG', TJK: 'TJ', TKM: 'TM', AFG: 'AF', NPL: 'NP', LKA: 'LK',
      MMR: 'MM', KHM: 'KH', LAO: 'LA',
    };
    return map[alpha3?.toUpperCase()] ?? alpha3?.substring(0, 2).toUpperCase() ?? '';
  }

  /** Convert period string ID to number of days. "1w"=7, "1m"=30, "2m"=60, etc. */
  private periodIdToDays(id: string): number {
    const match = /^(\d+)(w|m|y|d)$/.exec(id.toLowerCase());
    if (!match) return 0;
    const n = parseInt(match[1]);
    switch (match[2]) {
      case 'd': return n;
      case 'w': return n * 7;
      case 'm': return n * 30;
      case 'y': return n * 365;
      default:  return 0;
    }
  }

  // ─── Service catalog building ────────────────────────────────────────────────

  private buildServicesFromReference(
    type: ProxySellerType,
    ref: ReferenceData,
  ): ProviderService[] {
    if (!ref.countries.length || !ref.periods.length) return [];

    const displayNames: Record<ProxySellerType, string> = {
      mobile: 'Mobile Proxy',
      ipv4: 'IPv4 Proxy',
      isp: 'ISP Proxy (Static Residential)',
      ipv6: 'IPv6 Proxy',
    };

    const protocols = type === 'ipv6' ? ['HTTP'] : ['HTTP', 'SOCKS5'];

    return [{
      externalId: `proxyseller-${type}`,
      name: displayNames[type],
      description: this.buildDescription(type),
      category: 'PROXY',
      subcategory: type,
      price: 0, // Real price fetched via order/calc at purchase time
      minQty: 1,
      maxQty: 100,
      currency: 'USD',
      available: true,
      inStock: true,
      countries: ref.countries
        .filter((c) => c.code && c.code.length === 2)
        .map((c) => ({ code: c.code.toUpperCase(), name: c.name, available: true })),
      features: {
        proxyType: type,
        protocols,
        periods: ref.periods.map((p) => ({ id: p.id, days: p.days, name: p.name })),
        operators: ref.operators?.map((o) => ({ id: o.id, name: o.name })) ?? [],
        rotations: ref.rotations?.map((r) => ({ id: r.id, name: r.name })) ?? [],
        unlimitedBandwidth: true,
      },
    }];
  }

  private buildDescription(type: ProxySellerType): string {
    const descriptions: Record<ProxySellerType, string> = {
      mobile: 'Real 4G/5G SIM-based mobile proxies. Unlimited bandwidth, carrier targeting.',
      ipv4: 'Dedicated IPv4 datacenter proxies. Fast and cost-effective.',
      isp: 'Static residential IPs hosted in datacenters. ISP legitimacy at datacenter speed.',
      ipv6: 'High-volume IPv6 proxies at the lowest per-IP price.',
    };
    return descriptions[type];
  }

  // ─── Order helpers ───────────────────────────────────────────────────────────

  private extractOrderParams(request: ProviderOrderRequest) {
    const d = request.customData ?? {};

    const proxyType = d.proxyType as ProxySellerType;
    if (!CATALOG_TYPES.includes(proxyType)) {
      throw new ProxySellerApiError(400, `ProxySeller: invalid proxyType "${proxyType}". Must be one of: ${CATALOG_TYPES.join(', ')}`);
    }

    const countryId = Number(d.countryId);
    if (!Number.isInteger(countryId) || countryId <= 0) {
      throw new ProxySellerApiError(400, 'ProxySeller: countryId must be a positive integer');
    }

    const periodId = String(d.periodId ?? '');
    if (!periodId) {
      throw new ProxySellerApiError(400, 'ProxySeller: periodId is required (e.g. "1w", "1m", "3m")');
    }

    return {
      proxyType,
      countryId,
      periodId, // Keep as string: "1w", "1m", etc.
      quantity: request.quantity ?? 1,
      protocol: (d.protocol as string | undefined)?.toUpperCase() ?? 'HTTP',
      mobileServiceType: (d.mobileServiceType as string | undefined) ?? 'dedicated',
      operatorId: d.operatorId ? String(d.operatorId) : undefined,
      rotationId: d.rotationId !== undefined ? Number(d.rotationId) : undefined,
    };
  }

  private buildOrderBody(params: ReturnType<typeof this.extractOrderParams>): Record<string, unknown> {
    const base = {
      countryId: params.countryId,
      periodId: params.periodId,
      quantity: params.quantity,
      paymentId: PAYMENT_ID_BALANCE,
      customTargetName: 'Other',
    };

    if (params.proxyType === 'mobile') {
      return {
        ...base,
        mobileServiceType: params.mobileServiceType,
        protocol: params.protocol,
        ...(params.operatorId ? { operatorId: params.operatorId } : {}),
        ...(params.rotationId ? { rotationId: params.rotationId } : {}),
      };
    }

    if (params.proxyType === 'ipv4' || params.proxyType === 'isp') {
      return { ...base, protocol: params.protocol };
    }

    // ipv6 no protocol field
    return base;
  }

  private mapSubcategoryToType(subcategory: string): ProxySellerType {
    if (CATALOG_TYPES.includes(subcategory as ProxySellerType)) {
      return subcategory as ProxySellerType;
    }
    return 'mobile';
  }

  // ─── Delivery data ───────────────────────────────────────────────────────────

  private toDeliveryData(proxy: ProxySellerProxy) {
    return {
      host: proxy.host ?? proxy.ip,
      port: proxy.port,
      protocol: proxy.protocol?.toLowerCase() ?? 'http',
      username: proxy.user,
      password: proxy.pass,
      countryCode: proxy.countryCode ?? proxy.country,
      operator: proxy.operator,
      expiresAt: proxy.expiresAt,
      orderId: proxy.orderId,
      orderNumber: proxy.orderNumber,
      proxyState: proxy.expiresAt && Date.parse(proxy.expiresAt) > Date.now() ? 'ACTIVE' : 'EXPIRED',
    };
  }

  // ─── HTTP helpers ────────────────────────────────────────────────────────────

  private url(endpoint: string): string {
    if (!this.apiKey) throw new ProxySellerApiError(401, 'ProxySeller API key is not configured');
    const base = `${this.baseUrl}/${this.apiKey}`;
    return `${base}/${endpoint.replace(/^\//, '')}`;
  }

  private async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(this.url(endpoint), {
      headers: { Accept: 'application/json' },
    });
    return this.parseResponse<T>(response);
  }

  private async post<T>(endpoint: string, body: unknown): Promise<T> {
    const response = await fetch(this.url(endpoint), {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return this.parseResponse<T>(response);
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const text = await response.text();
    let data: unknown;
    try { data = text ? JSON.parse(text) : undefined; } catch { data = text; }

    if (!response.ok) {
      const msg = this.extractError(data) ?? response.statusText;
      throw new ProxySellerApiError(response.status, `ProxySeller API error ${response.status}: ${msg}`);
    }

    // ProxySeller wraps some responses: { status: 1, data: {...} }
    // Others return the payload directly.
    const wrapped = data as any;
    if (wrapped && typeof wrapped === 'object' && 'data' in wrapped && 'status' in wrapped) {
      if (wrapped.status === 0 || wrapped.status === false) {
        const errors = wrapped.errors ?? wrapped.message ?? 'Unknown error';
        const errList = Array.isArray(errors) ? errors : [String(errors)];
        throw new ProxySellerApiError(400, `ProxySeller: ${errList.join(', ')}`, errList);
      }
      return wrapped.data as T;
    }

    return data as T;
  }

  private extractError(data: unknown): string | null {
    if (!data || typeof data !== 'object') return null;
    const d = data as Record<string, unknown>;
    if (typeof d.message === 'string') return d.message;
    if (Array.isArray(d.errors) && d.errors.length) return d.errors.join(', ');
    return null;
  }
}
