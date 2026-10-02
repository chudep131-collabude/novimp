import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AdminService } from '@/admin/admin.service';
import { OrdersService } from '@/orders/orders.service';
import { UserRole, OrderStatus } from '@prisma/client';

@Injectable()
export class TelegramBotService implements OnModuleInit {
  private readonly logger = new Logger(TelegramBotService.name);

  constructor(
    private telegramService: TelegramService,
    private prisma: PrismaService,
    private adminService: AdminService,
    private ordersService: OrdersService,
  ) {}

  onModuleInit() {
    const bot = this.telegramService.getBotInstance();
    if (!bot) {
      this.logger.warn('Bot instance not found. Admin bot commands will not be registered.');
      return;
    }

    // Middleware to check if user is admin
    const checkAdmin = async (ctx: any, next: () => Promise<void>) => {
      const telegramId = ctx.from?.id?.toString();
      if (!telegramId) return;

      const user = await this.prisma.user.findFirst({
        where: { telegramId },
      });

      if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
        ctx.state.user = user;
        return next();
      } else {
        await ctx.reply('You are not authorized to use these commands.');
      }
    };

    bot.command('start', async (ctx) => {
      const telegramId = ctx.from?.id?.toString();
      const user = await this.prisma.user.findFirst({
        where: { telegramId },
      });

      if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
        await ctx.reply(
          `Welcome back, Admin! Here are your available commands:\n\n` +
          `/stats - Get dashboard statistics\n` +
          `/order <id> - Get order details\n` +
          `/setstatus <id> <status> - Update order status (e.g. COMPLETED, CANCELLED)`
        );
      } else {
        await ctx.reply('Welcome! Please use the Mini App to access the platform.');
      }
    });

    bot.command('stats', checkAdmin, async (ctx) => {
      try {
        const stats = await this.adminService.getDashboardStats();
        
        const message = 
          `📊 <b>Dashboard Stats</b>\n\n` +
          `👥 <b>Total Users:</b> ${stats.users.total}\n` +
          `📦 <b>Total Orders:</b> ${stats.orders.total}\n` +
          `💰 <b>Total Revenue:</b> $${Number(stats.revenue.total).toFixed(2)}\n\n` +
          `🔄 <b>Pending Orders:</b> ${stats.orders.pending}\n` +
          `❌ <b>Failed Orders:</b> ${stats.orders.failed}`;

        await ctx.reply(message, { parse_mode: 'HTML' });
      } catch (error) {
        this.logger.error('Error fetching stats', error);
        await ctx.reply('Failed to fetch statistics.');
      }
    });

    bot.command('order', checkAdmin, async (ctx) => {
      // @ts-ignore
      const args = ctx.message?.text?.split(' ').slice(1) || [];
      if (args.length === 0) {
        return ctx.reply('Please provide an order number (e.g., /order ORD-123)');
      }

      const orderNumber = args[0];
      try {
        const order = await this.prisma.order.findUnique({
          where: { orderNumber },
        });

        if (!order) {
          return ctx.reply(`Order ${orderNumber} not found.`);
        }

        const message = 
          `📦 <b>Order ${order.orderNumber}</b>\n\n` +
          `<b>Status:</b> ${order.status}\n` +
          `<b>Amount:</b> $${order.totalAmount.toNumber().toFixed(2)}\n` +
          `<b>Target:</b> ${order.targetUsername || order.targetUrl || 'N/A'}\n` +
          `<b>Quantity:</b> ${order.quantity}\n\n` +
          `<i>Created at: ${order.createdAt.toISOString()}</i>`;

        await ctx.reply(message, { parse_mode: 'HTML' });
      } catch (error) {
        this.logger.error(`Error fetching order ${orderNumber}`, error);
        await ctx.reply('Failed to fetch order details.');
      }
    });

    bot.command('setstatus', checkAdmin, async (ctx) => {
      // @ts-ignore
      const args = ctx.message?.text?.split(' ').slice(1) || [];
      if (args.length < 2) {
        return ctx.reply('Usage: /setstatus <orderNumber> <STATUS>\nValid statuses: COMPLETED, CANCELLED, REFUNDED, FAILED, PARTIAL');
      }

      const orderNumber = args[0];
      const status = args[1].toUpperCase() as OrderStatus;
      const adminUser = ctx.state.user;

      try {
        const order = await this.prisma.order.findUnique({
          where: { orderNumber },
        });

        if (!order) {
          return ctx.reply(`Order ${orderNumber} not found.`);
        }

        await this.ordersService.updateStatus(order.id, status, {
          actorId: adminUser.id,
          reason: 'Updated via Telegram Bot by Admin',
        });

        await ctx.reply(`✅ Order ${orderNumber} status updated to <b>${status}</b>.`, { parse_mode: 'HTML' });
      } catch (error: any) {
        this.logger.error(`Error updating order ${orderNumber}`, error);
        await ctx.reply(`Failed to update order: ${error.message}`);
      }
    });

    // Launch the bot in the background errors must not crash the process
    try {
      bot.launch().catch((err: Error) => {
        this.logger.error('Telegram bot launch failed', err.message, 'TelegramBotService');
      });
      this.logger.log('Telegram bot polling started');
    } catch (err: any) {
      this.logger.error('Failed to launch Telegram bot', err, 'TelegramBotService');
    }
  }
}
