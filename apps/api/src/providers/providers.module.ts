import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { ProviderAdapterFactory } from './provider-adapter.factory';
import { ProviderSeedService } from './provider-seed.service';
import { AutoSMOAdapter } from './adapters/autosmo.adapter';
import { ProxySellerAdapter } from './adapters/proxyseller.adapter';
import { OnlineSIMAdapter } from './adapters/onlinesim.adapter';

@Module({
  providers: [
    ProvidersService,
    ProviderAdapterFactory,
    ProviderSeedService,
    AutoSMOAdapter,
    ProxySellerAdapter,
    OnlineSIMAdapter,
  ],
  controllers: [ProvidersController],
  exports: [ProvidersService, ProviderAdapterFactory],
})
export class ProvidersModule {}
