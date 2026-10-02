import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { EncryptionService } from '@/common/encryption/encryption.service';

interface ProviderSeedConfig {
  /** Unique slug used as the `name` field and upsert key. */
  name: string;
  displayName: string;
  adapterType: string;
  apiKeyEnvVar: string;
  apiUrlEnvVar: string;
  defaultApiUrl: string;
}

/** Canonical list of providers whose adapter code ships with the codebase.
 *  A provider is seeded (upserted) automatically on startup if its env var
 *  contains a real API key.  Providers with missing/placeholder keys are
 *  skipped gracefully no crash, just a log warning. */
const KNOWN_PROVIDERS: ProviderSeedConfig[] = [
  {
    name: 'autosmo',
    displayName: 'AutoSMO SMM Panel',
    adapterType: 'autosmo',
    apiKeyEnvVar: 'AUTOSMO_API_KEY',
    apiUrlEnvVar: 'AUTOSMO_API_URL',
    defaultApiUrl: 'https://autosmo.com/api/v2',
  },
  {
    name: 'proxyseller',
    displayName: 'ProxySeller',
    adapterType: 'proxyseller',
    apiKeyEnvVar: 'PROXYSELLER_API_KEY',
    apiUrlEnvVar: 'PROXYSELLER_API_URL',
    defaultApiUrl: 'https://proxy-seller.com/personal/api/v1',
  },
  {
    name: 'onlinesim',
    displayName: 'OnlineSIM',
    adapterType: 'onlinesim',
    apiKeyEnvVar: 'ONLINESIM_API_KEY',
    apiUrlEnvVar: 'ONLINESIM_API_URL',
    defaultApiUrl: 'https://onlinesim.io',
  },
];

/** Placeholder patterns if the key matches any of these we treat it as unset. */
const PLACEHOLDER_PATTERNS = [
  /^your-/i,
  /^placeholder/i,
  /^change-me/i,
  /^sk_test_/i,
  /^re_placeholder/i,
];

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((re) => re.test(value));
}

@Injectable()
export class ProviderSeedService implements OnModuleInit {
  private readonly logger = new Logger(ProviderSeedService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  async onModuleInit() {
    for (const provider of KNOWN_PROVIDERS) {
      await this.seedProvider(provider);
    }
  }

  private async seedProvider(cfg: ProviderSeedConfig) {
    const apiKey = this.config.get<string>(cfg.apiKeyEnvVar) ?? '';
    const apiUrl =
      this.config.get<string>(cfg.apiUrlEnvVar) || cfg.defaultApiUrl;

    if (!apiKey || isPlaceholder(apiKey)) {
      this.logger.warn(
        `${cfg.displayName}: ${cfg.apiKeyEnvVar} is not set or is a placeholder skipping seed.`,
      );
      return;
    }

    try {
      const encrypted = this.encryption.encrypt(apiKey);
      const apiKeyIv = `${encrypted.iv}:${encrypted.tag}`;

      await this.prisma.provider.upsert({
        where: { name: cfg.name },
        create: {
          name: cfg.name,
          displayName: cfg.displayName,
          adapterType: cfg.adapterType,
          apiUrl,
          apiKey: encrypted.encrypted,
          apiKeyIv,
          syncInterval: 300,
          syncEnabled: true,
          status: 'ACTIVE',
        },
        update: {
          // Keep display name and URL in sync with env; preserve status/syncEnabled
          // as they may have been changed by an admin.
          displayName: cfg.displayName,
          apiUrl,
          apiKey: encrypted.encrypted,
          apiKeyIv,
        },
      });

      this.logger.log(`${cfg.displayName} provider seeded/updated.`);
    } catch (err) {
      this.logger.error(
        `Failed to seed ${cfg.displayName}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
