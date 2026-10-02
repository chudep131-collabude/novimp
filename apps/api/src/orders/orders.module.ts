import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { WalletModule } from '../wallet/wallet.module';
import { ProvidersModule } from '../providers/providers.module';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [WalletModule, ProvidersModule, ServicesModule],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
