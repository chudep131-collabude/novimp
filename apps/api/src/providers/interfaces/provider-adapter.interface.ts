export interface ProviderService {
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
  countries?: Array<{ code: string; name: string; available: boolean }>;
  features?: Record<string, any>;
  estimatedTime?: string;
}

export interface ProviderOrderRequest {
  serviceId: string;
  quantity: number;
  targetUrl?: string;
  targetUsername?: string;
  customData?: Record<string, any>;
}

export interface ProviderOrderResponse {
  providerOrderId: string;
  status: string;
  deliveryData?: any;
  estimatedCompletion?: string;
}

export interface ProviderOrderStatus {
  status: string;
  completed: number;
  total: number;
  deliveryData?: any;
  errorMessage?: string;
}

export interface ProviderAdapter {
  readonly name: string;

  /** Bind provider credentials/base URL before use. */
  configure(apiKey: string, baseUrl: string): void;

  healthCheck(): Promise<{ healthy: boolean; responseTimeMs: number; message?: string }>;

  listServices(): Promise<ProviderService[]>;

  getServiceDetails(externalId: string): Promise<ProviderService | null>;

  checkAvailability(serviceId: string, quantity: number): Promise<boolean>;

  createOrder(request: ProviderOrderRequest): Promise<ProviderOrderResponse>;

  getOrderQuote?(request: ProviderOrderRequest): Promise<{ price: string; currency: string }>;

  getAvailableTariffs?(filters: {
    countryCode: string;
    proxyType: string;
    protocol: string;
  }): Promise<Array<{ period: number; price: number }>>;

  getOrderStatus(providerOrderId: string): Promise<ProviderOrderStatus>;

  cancelOrder(providerOrderId: string): Promise<boolean>;

  getBalance?(): Promise<{ balance: number; currency: string }>;
}
