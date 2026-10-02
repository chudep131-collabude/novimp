import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, IsOptional, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string;

  @IsString()
  @IsOptional()
  REDIS_URL?: string = 'redis://localhost:6379';

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRATION?: string = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRATION?: string = '7d';

  @IsString()
  ENCRYPTION_KEY: string;

  @IsString()
  @IsOptional()
  NODE_ENV?: string = 'development';

  @IsNumber()
  @IsOptional()
  API_PORT?: number = 4000;

  @IsString()
  @IsOptional()
  APP_URL?: string = 'http://localhost:3000';

  @IsString()
  @IsOptional()
  FRONTEND_URL?: string = 'http://localhost:3000';

  // ─── Email (Resend) ──────────────────────────────────────────────────────────
  @IsString()
  @IsOptional()
  RESEND_API_KEY?: string;

  @IsString()
  @IsOptional()
  RESEND_FROM_EMAIL?: string = 'noreply@yourdomain.com';

  @IsString()
  @IsOptional()
  RESEND_FROM_NAME?: string = 'NoviMP';

  // ─── Telegram ────────────────────────────────────────────────────────────────
  /** Bot token from @BotFather — optional so the app still starts without it. */
  @IsString()
  @IsOptional()
  TELEGRAM_BOT_TOKEN?: string;

  /** Comma-separated Telegram user IDs granted SUPER_ADMIN on login. */
  @IsString()
  @IsOptional()
  TELEGRAM_ADMIN_IDS?: string;

  // --- Payment Gateway (Heleket) ──────────────────────────────────────────────
  @IsString()
  @IsOptional()
  HELEKET_MERCHANT_ID?: string;

  @IsString()
  @IsOptional()
  HELEKET_PAYMENT_KEY?: string;

  @IsString()
  @IsOptional()
  HELEKET_API_URL?: string = 'https://api.heleket.com';

  // --- Providers ──────────────────────────────────────────────────────────────
  @IsString()
  @IsOptional()
  AUTOSMO_API_KEY?: string;

  @IsString()
  @IsOptional()
  AUTOSMO_API_URL?: string;

  @IsString()
  @IsOptional()
  PROXYSELLER_API_KEY?: string;

  @IsString()
  @IsOptional()
  PROXYSELLER_API_URL?: string = 'https://proxy-seller.com/personal/api/v1';

  @IsString()
  @IsOptional()
  ONLINESIM_API_KEY?: string;

  @IsString()
  @IsOptional()
  ONLINESIM_API_URL?: string;

  // ─── Logging ─────────────────────────────────────────────────────────────────
  @IsString()
  @IsOptional()
  LOG_LEVEL?: string = 'info';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(errors.map(e => Object.values(e.constraints || {}).join(', ')).join('; '));
  }
  return validatedConfig;
}
