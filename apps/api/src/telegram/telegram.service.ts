import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';

@Injectable()
export class TelegramService implements OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf | null = null;
  private isEnabled = false;

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (token && this.isValidToken(token)) {
      try {
        this.bot = new Telegraf(token);
        this.isEnabled = true;
        this.logger.log('Telegram bot initialized');
      } catch (error) {
        this.logger.error('Failed to initialize Telegram bot', error);
      }
    } else if (token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN looks like a placeholder bot disabled. Set a real token from @BotFather.');
    } else {
      this.logger.warn('TELEGRAM_BOT_TOKEN not provided, bot notifications disabled');
    }
  }

  /** Telegram bot tokens are always in the format <digits>:<35-char alphanumeric string> */
  private isValidToken(token: string): boolean {
    return /^\d{8,12}:[A-Za-z0-9_-]{35}$/.test(token);
  }

  getBotInstance(): Telegraf | null {
    return this.bot;
  }

  async sendMessage(chatId: string, text: string, options?: any): Promise<boolean> {
    if (!this.isEnabled || !this.bot) return false;
    
    try {
      await this.bot.telegram.sendMessage(chatId, text, {
        parse_mode: 'HTML',
        ...options,
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send message to ${chatId}`, error);
      return false;
    }
  }

  onModuleDestroy() {
    if (this.bot) {
      this.bot.stop('SIGTERM');
      this.logger.log('Telegram bot stopped');
    }
  }
}
