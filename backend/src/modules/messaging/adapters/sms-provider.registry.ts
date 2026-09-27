import { Injectable, Logger } from '@nestjs/common';
import { MockSmsProviderAdapter } from './mock.adapter.js';
import { KocaeliSmsProviderAdapter } from './kocaeli.adapter.js';
import { PermanentProviderError, type SmsProviderAdapter } from './sms-provider.adapter.js';

export function isSmsProviderLiveMode() {
  return (process.env.SMS_PROVIDER_MODE || 'mock').toLowerCase() === 'live';
}

@Injectable()
export class SmsProviderRegistry {
  private readonly logger = new Logger(SmsProviderRegistry.name);
  private readonly adapters = new Map<string, SmsProviderAdapter>();

  constructor(
    private readonly mock: MockSmsProviderAdapter,
    kocaeli: KocaeliSmsProviderAdapter,
  ) {
    this.adapters.set(mock.code, mock);
    this.adapters.set(kocaeli.code, kocaeli);
    this.adapters.set('KOCAELI', kocaeli);
  }

  resolve(providerCode?: string | null, opts?: { forceMock?: boolean }): SmsProviderAdapter {
    if (opts?.forceMock || !isSmsProviderLiveMode()) return this.mock;
    const code = (providerCode || '').toUpperCase();
    if (!code || code === 'MOCK') return this.mock;
    const adapter = this.adapters.get(code);
    if (!adapter) {
      this.logger.warn(`No live adapter registered for provider ${code}`);
      throw new PermanentProviderError(`Bu SMS saglayicisi henuz baglanmadi: ${code}`);
    }
    return adapter;
  }
}
