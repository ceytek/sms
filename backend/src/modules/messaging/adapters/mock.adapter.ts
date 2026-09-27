import { Injectable, Logger } from '@nestjs/common';
import { redisConnection } from '../queue/redis.connection.js';
import type {
  ProviderCallConfig,
  ProviderCallContext,
  ProviderGateway,
  ProviderQueryResult,
  ProviderSendItem,
  ProviderSendResult,
  ProviderSender,
  ProviderSmsDetail,
  SmsDetailReportQuery,
  SmsProviderAdapter,
  SmsReportQuery,
  SmsSummaryQuery,
} from './sms-provider.adapter.js';
import { chooseProviderSendMode } from './provider-ids.js';

type Stored = {
  status: ProviderQueryResult['status'];
  providerMessageId: string;
  to: string;
};

const TTL_SECONDS = 7 * 24 * 3600;

@Injectable()
export class MockSmsProviderAdapter implements SmsProviderAdapter {
  readonly code = 'MOCK';
  private readonly logger = new Logger(MockSmsProviderAdapter.name);
  private redis = redisConnection();

  async sendBatch(input: {
    originator: string;
    items: ProviderSendItem[];
    credentials: Record<string, string>;
    config?: ProviderCallConfig;
  }): Promise<ProviderSendResult> {
    const mode = chooseProviderSendMode(input.items);
    if (mode === 'single') {
      return this.sendSingle({
        originator: input.originator,
        item: input.items[0],
        credentials: input.credentials,
        config: input.config,
      });
    }
    if (mode === 'bulk') return this.sendBulk(input);
    return this.sendDynamic(input);
  }

  async sendSingle(input: {
    originator: string;
    item: ProviderSendItem;
    credentials: Record<string, string>;
    config?: ProviderCallConfig;
  }) {
    return this.accept([input.item]);
  }

  async sendBulk(input: {
    originator: string;
    items: ProviderSendItem[];
    credentials: Record<string, string>;
    config?: ProviderCallConfig;
  }) {
    return this.accept(input.items);
  }

  async sendDynamic(input: {
    originator: string;
    items: ProviderSendItem[];
    credentials: Record<string, string>;
    config?: ProviderCallConfig;
  }) {
    return this.accept(input.items);
  }

  async queryByReference(clientReference: string): Promise<ProviderQueryResult | null> {
    const row = await this.read(clientReference);
    if (!row) return null;
    return {
      clientReference,
      status: row.status,
      providerMessageId: row.providerMessageId,
    };
  }

  async getSmsReport(_query: SmsReportQuery, _ctx: ProviderCallContext) {
    return [];
  }

  async getSmsDetailReport(_query: SmsDetailReportQuery, _ctx: ProviderCallContext): Promise<ProviderSmsDetail[]> {
    return [];
  }

  async getSmsSummary(_query: SmsSummaryQuery, _ctx: ProviderCallContext) {
    return { total: 0, delivered: 0, undelivered: 0, pending: 0, rCount: 0, credit: 0 };
  }

  async getSenders(_ctx: ProviderCallContext): Promise<ProviderSender[]> {
    return [];
  }

  async getGateways(_ctx: ProviderCallContext): Promise<ProviderGateway[]> {
    return [];
  }

  async getCredit(_ctx: ProviderCallContext) {
    return 0;
  }

  async markDelivered(clientReference: string) {
    const row = await this.read(clientReference);
    if (!row) return;
    row.status = 'DELIVERED';
    await this.write(clientReference, row);
  }

  private async accept(items: ProviderSendItem[]): Promise<ProviderSendResult> {
    const mapped = [];
    await new Promise((resolve) => setTimeout(resolve, 400));
    for (const item of items) {
      const existing = await this.read(item.clientReference);
      if (existing) {
        mapped.push({
          clientReference: item.clientReference,
          accepted: true,
          providerMessageId: existing.providerMessageId,
        });
        continue;
      }
      const stored: Stored = {
        status: 'DELIVERED',
        providerMessageId: `mock-${item.clientReference}`,
        to: item.to,
      };
      await this.write(item.clientReference, stored);
      this.logger.debug(`Mock delivered ${item.to} ref=${item.clientReference}`);
      mapped.push({
        clientReference: item.clientReference,
        accepted: true,
        providerMessageId: stored.providerMessageId,
      });
    }
    return { provider: this.code, mock: true, items: mapped, providerBatchId: mapped[0]?.providerMessageId };
  }

  private key(ref: string) {
    return `sms:provider:mock:${ref}`;
  }

  private async read(ref: string): Promise<Stored | null> {
    const raw = await this.redis.get(this.key(ref));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Stored;
    } catch {
      return null;
    }
  }

  private async write(ref: string, stored: Stored) {
    await this.redis.set(this.key(ref), JSON.stringify(stored), 'EX', TTL_SECONDS);
  }
}
