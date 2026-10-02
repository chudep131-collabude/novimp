import { Injectable } from '@nestjs/common';
import { ProviderAdapter, ProviderService, ProviderOrderRequest, ProviderOrderResponse, ProviderOrderStatus } from '../interfaces/provider-adapter.interface';
import { LoggerService } from '@/common/logger/logger.service';

/**
 * AutoSMO Provider Adapter
 * Handles Social Media Marketing services
 */
@Injectable()
export class AutoSMOAdapter implements ProviderAdapter {
  readonly name = 'AutoSMO';
  private apiKey: string = '';
  private baseUrl: string = '';

  constructor(private logger: LoggerService) {}

  configure(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async healthCheck(): Promise<{ healthy: boolean; responseTimeMs: number; message?: string }> {
    const start = Date.now();
    try {
      // AutoSMO balance endpoint as health check
      await this.makeRequest('/balance');
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
    const response = await this.makeRequest('/services');

    return response.map((svc: any) => ({
        externalId: svc.service.toString(),
        name: svc.name,
        description: svc.name,
        category: 'SMM',
        // Use AutoSMO's own category field as platform it's already labelled
        // like "Instagram Followers", "TikTok Views", etc. We just strip the emoji.
        platform: this.detectPlatform(svc.category, svc.name),
        subcategory: svc.category,
        // rate is per 1000 units convert to per-unit price
        price: parseFloat(svc.rate) / 1000,
        minQty: parseInt(svc.min) || 1,
        maxQty: parseInt(svc.max) || undefined,
        currency: 'USD',
        available: true,
        inStock: true,
        estimatedTime: svc.average_time || undefined,
        features: {
          type: svc.type,
          refill: svc.refill === true || svc.refill === 'true',
          cancel: svc.cancel === true || svc.cancel === 'true',
          dripfeed: svc.dripfeed === true || svc.dripfeed === 'true',
        },
      }));
  }

  async getServiceDetails(externalId: string): Promise<ProviderService | null> {
    const services = await this.listServices();
    return services.find(s => s.externalId === externalId) || null;
  }

  async checkAvailability(serviceId: string, quantity: number): Promise<boolean> {
    const service = await this.getServiceDetails(serviceId);
    if (!service) return false;
    return quantity >= service.minQty && (!service.maxQty || quantity <= service.maxQty);
  }

  async createOrder(request: ProviderOrderRequest): Promise<ProviderOrderResponse> {
    const response = await this.makeRequest('/add', {
      service: request.serviceId,
      link: request.targetUrl || request.targetUsername,
      quantity: request.quantity,
    });

    return {
      providerOrderId: response.order.toString(),
      status: 'PENDING',
    };
  }

  async getOrderStatus(providerOrderId: string): Promise<ProviderOrderStatus> {
    const response = await this.makeRequest('/status', { order: providerOrderId });

    const statusMap: Record<string, string> = {
      Pending: 'PENDING',
      'In progress': 'PROCESSING',
      Completed: 'COMPLETED',
      Partial: 'PARTIAL',
      Canceled: 'CANCELLED',
    };

    return {
      status: statusMap[response.status] || response.status,
      completed: parseInt(response.start_count) || 0,
      total: parseInt(response.remains) || 0,
    };
  }

  async cancelOrder(providerOrderId: string): Promise<boolean> {
    try {
      await this.makeRequest('/cancel', { order: providerOrderId });
      return true;
    } catch {
      return false;
    }
  }

  async getBalance(): Promise<{ balance: number; currency: string }> {
    const response = await this.makeRequest('/balance');
    return {
      balance: parseFloat(response.balance),
      currency: response.currency || 'USD',
    };
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}) {
    let baseUrlString = this.baseUrl.trim();
    // Auto-append /api/v2 if the user only provided the domain
    if (baseUrlString.endsWith('/api')) {
      baseUrlString += '/v2';
    } else if (!baseUrlString.endsWith('/api/v2') && !baseUrlString.includes('/api/')) {
      baseUrlString = baseUrlString.endsWith('/') ? `${baseUrlString}api/v2` : `${baseUrlString}/api/v2`;
    }
    const url = new URL(baseUrlString);
    
    const body = new URLSearchParams();
    body.append('key', this.apiKey);
    body.append('action', endpoint.replace('/', ''));

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) body.append(key, String(value));
    });

    const response = await fetch(url.toString(), {
      method: 'POST',
      body: body,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NoviMP/1.0',
      },
    });

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {}
      throw new Error(`AutoSMO API error: ${response.status} ${errorText.substring(0, 100)}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`AutoSMO error: ${data.error}`);
    }

    return data;
  }

  /**
   * Detect platform from AutoSMO's category label (primary) and service name (fallback).
   * AutoSMO categories are emoji-prefixed strings like "📸 Instagram Followers",
   * "🎵 TikTok", "💚 WhatsApp Channels", etc. We strip the emoji first.
   */
  private detectPlatform(category: string, name: string): string {
    const PLATFORMS: Array<{ key: string; patterns: RegExp[] }> = [
      { key: 'Instagram',     patterns: [/instagram/i] },
      { key: 'TikTok',        patterns: [/tiktok/i, /tik\s*tok/i] },
      { key: 'YouTube',       patterns: [/youtube/i] },
      { key: 'Telegram',      patterns: [/telegram/i] },
      { key: 'Facebook',      patterns: [/facebook/i] },
      { key: 'Twitter',       patterns: [/twitter/i, /\bx\b(?:\s|$)/i] },
      { key: 'Spotify',       patterns: [/spotify/i] },
      { key: 'SoundCloud',    patterns: [/soundcloud/i] },
      { key: 'Twitch',        patterns: [/twitch/i] },
      { key: 'LinkedIn',      patterns: [/linkedin/i] },
      { key: 'Reddit',        patterns: [/reddit/i] },
      { key: 'Snapchat',      patterns: [/snapchat/i] },
      { key: 'Pinterest',     patterns: [/pinterest/i] },
      { key: 'WhatsApp',      patterns: [/whatsapp/i] },
      { key: 'Trustpilot',    patterns: [/trustpilot/i] },
      { key: 'Dribbble',      patterns: [/dribbble/i] },
      { key: 'Discord',       patterns: [/discord/i] },
      { key: 'VK',            patterns: [/\bvk\b/i, /vk\.com/i] },
      { key: 'Audiomack',     patterns: [/audiomack/i] },
      { key: 'Threads',       patterns: [/threads/i] },
      { key: 'Kick',          patterns: [/\bkick\b/i] },
      { key: 'Quora',         patterns: [/quora/i] },
      { key: 'Deezer',        patterns: [/deezer/i] },
      { key: 'Tidal',         patterns: [/tidal/i] },
      { key: 'Shazam',        patterns: [/shazam/i] },
      { key: 'Mixcloud',      patterns: [/mixcloud/i] },
      { key: 'Dailymotion',   patterns: [/dailymotion/i] },
      { key: 'Vimeo',         patterns: [/vimeo/i] },
      { key: 'Rutube',        patterns: [/rutube/i] },
      { key: 'CoinMarketCap', patterns: [/coinmarketcap/i] },
      { key: 'Genius',        patterns: [/genius/i] },
      { key: 'Max.ru',        patterns: [/max\.ru/i, /\bmax\b.*ru\b/i] },
      { key: 'Jaco',          patterns: [/\bjaco\b/i] },
      { key: 'Chaturbate',    patterns: [/chaturbate/i] },
      { key: 'Rumble',        patterns: [/\brumble\b/i] },
      { key: 'Web Traffic',   patterns: [/traffic/i, /\bseo\b/i] },
    ];

    // Strip leading emoji/symbols so "📸 Instagram Followers" → "Instagram Followers"
    const stripEmoji = (text: string) =>
      text.replace(/^[\p{Emoji}\p{Symbol}\p{Punctuation}\s]+/u, '').trim();

    const detect = (text: string): string[] => {
      const clean = stripEmoji(text);
      const found: string[] = [];
      for (const p of PLATFORMS) {
        if (p.patterns.some(r => r.test(clean) || r.test(text))) {
          if (!found.includes(p.key)) found.push(p.key);
        }
      }
      return found;
    };

    // Primary: use AutoSMO's own category label
    const fromCategory = detect(category);
    if (fromCategory.length === 1) return fromCategory[0];
    if (fromCategory.length > 1) return 'Mixed';

    // Fallback: check the service name
    const fromName = detect(name);
    if (fromName.length === 1) return fromName[0];
    if (fromName.length > 1) return 'Mixed';

    // Last resort: anything in "Best Offers" or "Private" stays as-is
    if (/best.?offer/i.test(category)) return 'Best Offers';
    if (/private/i.test(category)) return 'Other';

    return 'Other';
  }
}

