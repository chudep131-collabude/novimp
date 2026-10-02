import { Module, Global } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramBotService } from './telegram-bot.service';
import { AdminModule } from '@/admin/admin.module';
import { OrdersModule } from '@/orders/orders.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule, AdminModule, OrdersModule],
  providers: [TelegramService, TelegramBotService],
  exports: [TelegramService],
})
export class TelegramModule {}
