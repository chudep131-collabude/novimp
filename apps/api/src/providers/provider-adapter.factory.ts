import { Injectable } from '@nestjs/common';
import { ProviderAdapter } from './interfaces/provider-adapter.interface';
import { AutoSMOAdapter } from './adapters/autosmo.adapter';
import { ProxySellerAdapter } from './adapters/proxyseller.adapter';
import { OnlineSIMAdapter } from './adapters/onlinesim.adapter';

@Injectable()
export class ProviderAdapterFactory {
  constructor(
    private autoSMO: AutoSMOAdapter,
    private proxySeller: ProxySellerAdapter,
    private onlineSIM: OnlineSIMAdapter,
  ) {}

  getAdapter(adapterType: string): ProviderAdapter {
    switch (adapterType.toLowerCase()) {
      case 'autosmo':
        return this.autoSMO;
      case 'proxyseller':
        return this.proxySeller;
      case 'onlinesim':
        return this.onlineSIM;
      default:
        throw new Error(`Unknown adapter type: ${adapterType}`);
    }
  }
}
