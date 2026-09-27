import { Injectable, Logger } from '@nestjs/common';
import { redisConnection } from '../queue/redis.connection.js';
import {
  PermanentProviderError,
  RetryableProviderError,
  type ProviderCallConfig,
  type ProviderCallContext,
  type ProviderGateway,
  type ProviderQueryResult,
  type ProviderSendItem,
  type ProviderSendResult,
  type ProviderSender,
  type ProviderSmsDetail,
  type ProviderSmsReport,
  type SmsDetailReportQuery,
  type SmsProviderAdapter,
  type SmsReportQuery,
  type SmsSummaryQuery,
} from './sms-provider.adapter.js';
import { providerJsonRequest, sanitizeProviderError } from './provider-http.client.js';
import {
  chooseProviderSendMode,
  mapAppEncodingToProvider,
  toProviderCustomId,
  toProviderTitle,
  toProviderValidity,
  toProviderXid,
} from './provider-ids.js';
import {
  CUSTOM_ID_DUPLICATION_CODE,
  classifyProviderError,
} from './provider-errors.js';

import { KOCAELI_API_METHODS, KOCAELI_API_PATHS } from './kocaeli-paths.js';

const CREDIT_CACHE_TTL_SEC = 60;
const DETAIL_PAGE_SIZE = 1000;

type ProviderErr = { code?: string; status?: number; message?: string };

@Injectable()
export class KocaeliSmsProviderAdapter implements SmsProviderAdapter {
  readonly code = 'VOICE_TELEKOM';
  private readonly logger = new Logger(KocaeliSmsProviderAdapter.name);
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
    if (mode === 'bulk') {
      return this.sendBulk(input);
    }
    return this.sendDynamic(input);
  }

  async sendSingle(input: {
    originator: string;
    item: ProviderSendItem;
    credentials: Record<string, string>;
    config?: ProviderCallConfig;
  }): Promise<ProviderSendResult> {
    const payload = this.basePayload(input.originator, input.config);
    payload.sendingType = 0;
    payload.number = input.item.to;
    payload.content = input.item.body;
    payload.customID = toProviderCustomId(input.config?.packageCustomId || input.item.clientReference);
    return this.postCreate(input.credentials, input.config, payload, [input.item]);
  }

  async sendBulk(input: {
    originator: string;
    items: ProviderSendItem[];
    credentials: Record<string, string>;
    config?: ProviderCallConfig;
  }): Promise<ProviderSendResult> {
    if (!input.items.length) {
      throw new PermanentProviderError('Bos SMS paketi');
    }
    const payload = this.basePayload(input.originator, input.config);
    payload.sendingType = 1;
    payload.content = input.items[0].body;
    payload.numbers = input.items.map((item) => item.to);
    payload.customID = toProviderCustomId(
      input.config?.packageCustomId || input.items[0].clientReference,
    );
    return this.postCreate(input.credentials, input.config, payload, input.items);
  }

  async sendDynamic(input: {
    originator: string;
    items: ProviderSendItem[];
    credentials: Record<string, string>;
    config?: ProviderCallConfig;
  }): Promise<ProviderSendResult> {
    if (!input.items.length) {
      throw new PermanentProviderError('Bos SMS paketi');
    }
    const payload = this.basePayload(input.originator, input.config);
    payload.sendingType = 2;
    payload.content = input.items[0].body;
    payload.numbers = input.items.map((item) => ({
      nr: item.to,
      msg: item.body,
      xid: toProviderXid(item.recipientId || item.clientReference),
    }));
    payload.customID = toProviderCustomId(
      input.config?.packageCustomId || input.items[0].clientReference,
    );
    return this.postCreate(input.credentials, input.config, payload, input.items);
  }

  async queryByReference(
    clientReference: string,
    ctx?: ProviderCallContext,
  ): Promise<ProviderQueryResult | null> {
    if (!ctx) return null;
    const customId = toProviderCustomId(clientReference);
    const reports = await this.getSmsReport({ customIds: [customId], pageIndex: 0, pageSize: 10 }, ctx);
    const match = reports.find((row) => row.customId === customId) ?? reports[0];
    if (!match?.id) return null;
    return {
      clientReference,
      status: 'ACCEPTED',
      providerMessageId: match.id,
      providerState: match.providerState,
    };
  }

  async getSmsReport(query: SmsReportQuery, ctx: ProviderCallContext): Promise<ProviderSmsReport[]> {
    const path = ctx.config?.reportPath || KOCAELI_API_PATHS.report;
    const pageSize = clampPage(query.pageSize, 10, 1000, 100);
    const body: Record<string, unknown> = {
      pageIndex: query.pageIndex ?? 0,
      pageSize,
    };
    if (query.packageIds?.length) {
      body.ids = query.packageIds.map((id) => Number(id)).filter((id) => Number.isFinite(id));
    }
    if (query.customIds?.length) body.customIDs = query.customIds;
    if (query.keyword) body.keyword = query.keyword;
    if (query.sender) body.sender = query.sender;
    if (query.startDate) body.startDate = query.startDate;
    if (query.finishDate) body.finishDate = query.finishDate;
    const response = await this.request(ctx, 'POST', path, body);
    this.throwIfProviderErr(response);
    const list = asList(response.json);
    return list.map((row) => ({
      id: row.id != null ? String(row.id) : undefined,
      customId: row.customID != null ? String(row.customID) : undefined,
      title: row.title != null ? String(row.title) : undefined,
      content: row.content != null ? String(row.content) : undefined,
      providerState: row.state != null ? String(row.state) : undefined,
      statistics: asNumberMap(row.statistics),
      raw: row,
    }));
  }

  async getSmsDetailReport(
    query: SmsDetailReportQuery,
    ctx: ProviderCallContext,
  ): Promise<ProviderSmsDetail[]> {
    const path = ctx.config?.detailReportPath || KOCAELI_API_PATHS.detailReport;
    const pageSize = clampPage(query.pageSize, 10, DETAIL_PAGE_SIZE, 100);
    const rows: ProviderSmsDetail[] = [];
    let pageIndex = query.pageIndex ?? 0;
    const singlePage = query.pageIndex != null;
    while (true) {
      const body: Record<string, unknown> = {
        pageIndex,
        pageSize,
      };
      if (query.packageId) body.pkgID = Number(query.packageId) || query.packageId;
      if (query.customId) body.customID = query.customId;
      if (query.target) body.target = query.target;
      const response = await this.request(ctx, 'POST', path, body);
      this.throwIfProviderErr(response);
      const list = asList(response.json);
      for (const row of list) {
        rows.push({
          target: row.target != null ? String(row.target) : undefined,
          xid: row.xid != null ? String(row.xid) : undefined,
          msg: row.msg != null ? String(row.msg) : undefined,
          providerState: row.state != null ? String(row.state) : undefined,
          sender: row.sender != null ? String(row.sender) : undefined,
          credit: typeof row.credit === 'number' ? row.credit : undefined,
          raw: row,
        });
      }
      if (singlePage || list.length < pageSize) break;
      pageIndex += 1;
    }
    return rows;
  }

  async getSmsSummary(query: SmsSummaryQuery, ctx: ProviderCallContext): Promise<Record<string, number>> {
    const path = ctx.config?.summaryPath || KOCAELI_API_PATHS.summary;
    const response = await this.request(ctx, 'POST', path, {
      startDate: query.startDate,
      finishDate: query.finishDate,
    });
    this.throwIfProviderErr(response);
    const data = asRecord(response.json?.data);
    return asNumberMap(data);
  }

  async getSenders(ctx: ProviderCallContext): Promise<ProviderSender[]> {
    const path = ctx.config?.sendersPath || KOCAELI_API_PATHS.senders;
    const response = await this.request(ctx, 'POST', path, { pageIndex: 0, pageSize: 100 });
    this.throwIfProviderErr(response);
    return asList(response.json).map((row) => ({
      uuid: String(row.uuid ?? ''),
      title: String(row.title ?? ''),
      status: row.status != null ? String(row.status) : undefined,
      gateways: Array.isArray(row.gateways) ? row.gateways.map((item) => String(item)) : [],
    }));
  }

  async getGateways(ctx: ProviderCallContext): Promise<ProviderGateway[]> {
    const path = ctx.config?.gatewaysPath || KOCAELI_API_PATHS.gateways;
    const response = await this.request(ctx, KOCAELI_API_METHODS.gateways, path);
    this.throwIfProviderErr(response);
    return asList(response.json).map((row) => ({
      uuid: String(row.uuid ?? ''),
      senders: Array.isArray(row.senders) ? row.senders.map((item) => String(item)) : [],
      raw: row,
    }));
  }

  async getCredit(ctx: ProviderCallContext): Promise<number> {
    const path = ctx.config?.creditPath || KOCAELI_API_PATHS.credit;
    const username = ctx.credentials.username?.trim() || 'unknown';
    const cacheKey = `sms:provider:credit:${this.code}:${username}`;
    const cached = await this.redis.get(cacheKey);
    if (cached != null && cached !== '') {
      const value = Number(cached);
      if (Number.isFinite(value)) return value;
    }
    const method = ctx.config?.creditMethod === 'POST' ? 'POST' : KOCAELI_API_METHODS.credit;
    const response = await this.request(ctx, method, path);
    this.throwIfProviderErr(response);
    const data = asRecord(response.json?.data);
    const credit = Number(data.credit);
    if (!Number.isFinite(credit)) {
      throw new PermanentProviderError('Provider kredi yaniti gecersiz');
    }
    await this.redis.set(cacheKey, String(credit), 'EX', CREDIT_CACHE_TTL_SEC);
    return credit;
  }

  private basePayload(
    originator: string,
    config?: ProviderCallConfig,
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      type: 1,
      sender: originator,
      title: toProviderTitle(config?.title || originator),
      encoding: mapAppEncodingToProvider(config?.encoding),
      validity: toProviderValidity(config?.validityMinutes),
      commercial: Boolean(config?.commercial),
    };
    if (config?.gateway) payload.gateway = config.gateway;
    if (config?.skipAhsQuery) payload.skipAhsQuery = true;
    if (config?.commercial && config.recipientAudience) {
      payload.recipientType = audienceToRecipientType(config.recipientAudience);
    }
    return payload;
  }

  private async postCreate(
    credentials: Record<string, string>,
    config: ProviderCallConfig | undefined,
    payload: Record<string, unknown>,
    items: ProviderSendItem[],
  ): Promise<ProviderSendResult> {
    const ctx: ProviderCallContext = { credentials, config };
    const path = config?.sendPath || KOCAELI_API_PATHS.send;
    let response: Awaited<ReturnType<typeof providerJsonRequest>>;
    try {
      response = await this.request(ctx, 'POST', path, payload);
    } catch (err) {
      if (err instanceof RetryableProviderError) throw err;
      throw err;
    }
    const err = asErr(response.json?.err);
    const data = asRecord(response.json?.data);
    const pkgId = data.pkgID != null ? String(data.pkgID) : undefined;

    if (err && (err.code || '').toUpperCase() === CUSTOM_ID_DUPLICATION_CODE) {
      return this.reconcileDuplicateCustomId(ctx, String(payload.customID || ''), items, pkgId, err.code);
    }

    if (err || response.status >= 400 || !pkgId) {
      const classified = classifyProviderError({
        code: err?.code,
        status: err?.status ?? response.status,
        message: sanitizeProviderError(err?.message || `Provider hata ${response.status}`),
      });
      if (classified.retryable) {
        throw new RetryableProviderError(classified.message, classified.code, classified.cooldownMs);
      }
      if (items.length === 1) {
        return {
          provider: this.code,
          mock: false,
          providerBatchId: pkgId,
          items: [
            {
              clientReference: items[0].clientReference,
              accepted: false,
              retryable: false,
              error: classified.message,
              rawCode: classified.code,
            },
          ],
        };
      }
      throw new PermanentProviderError(classified.message, classified.code);
    }

    this.logger.log(`Provider accepted pkgID=${pkgId} customID=${String(payload.customID || '')}`);
    return {
      provider: this.code,
      mock: false,
      providerBatchId: pkgId,
      items: items.map((item) => ({
        clientReference: item.clientReference,
        accepted: true,
        providerMessageId: pkgId,
      })),
    };
  }

  private async reconcileDuplicateCustomId(
    ctx: ProviderCallContext,
    customId: string,
    items: ProviderSendItem[],
    pkgId: string | undefined,
    rawCode?: string,
  ): Promise<ProviderSendResult> {
    this.logger.warn(`Provider customID duplication, reconciling customID=${customId}`);
    let resolvedPkgId = pkgId;
    if (!resolvedPkgId) {
      try {
        const reports = await this.getSmsReport({ customIds: [customId], pageIndex: 0, pageSize: 10 }, ctx);
        resolvedPkgId = reports.find((row) => row.customId === customId)?.id ?? reports[0]?.id;
      } catch (err) {
        this.logger.warn(
          `SmsReport reconcile skipped: ${err instanceof Error ? sanitizeProviderError(err.message) : 'hata'}`,
        );
      }
    }
    return {
      provider: this.code,
      mock: false,
      providerBatchId: resolvedPkgId,
      items: items.map((item) => ({
        clientReference: item.clientReference,
        accepted: true,
        providerMessageId: resolvedPkgId,
        rawCode,
      })),
    };
  }

  private async request(
    ctx: ProviderCallContext,
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ) {
    const username = ctx.credentials.username?.trim();
    const password = ctx.credentials.password;
    const baseUrl = (ctx.config?.baseUrl || '').replace(/\/+$/, '');
    if (!username || !password) {
      throw new PermanentProviderError('SMS hesap kullanici adi veya sifresi eksik');
    }
    if (!baseUrl) {
      throw new PermanentProviderError('Provider API adresi tanimli degil');
    }
    const timeoutMs = ctx.config?.timeoutMs ?? 15_000;
    const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const response = await providerJsonRequest({
      method,
      url,
      username,
      password,
      body,
      timeoutMs,
    });
    return response;
  }

  private throwIfProviderErr(response: { status: number; json: Record<string, unknown> | null }) {
    const err = asErr(response.json?.err);
    if (!err && response.status < 400) return;
    const classified = classifyProviderError({
      code: err?.code,
      status: err?.status ?? response.status,
      message: sanitizeProviderError(err?.message || `Provider hata ${response.status}`),
    });
    if (classified.retryable) {
      throw new RetryableProviderError(classified.message, classified.code, classified.cooldownMs);
    }
    throw new PermanentProviderError(classified.message, classified.code);
  }
}

function audienceToRecipientType(audience: 'INDIVIDUAL' | 'TRADER' | 'BOTH') {
  if (audience === 'TRADER') return 1;
  if (audience === 'BOTH') return 2;
  return 0;
}

function asErr(value: unknown): ProviderErr | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as ProviderErr;
  if (!row.code && !row.message && !row.status) return null;
  return row;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asList(json: Record<string, unknown> | null): Record<string, unknown>[] {
  const data = asRecord(json?.data);
  const list = data.list;
  if (!Array.isArray(list)) return [];
  return list.filter((row) => row && typeof row === 'object') as Record<string, unknown>[];
}

function asNumberMap(value: unknown): Record<string, number> {
  const row = asRecord(value);
  const out: Record<string, number> = {};
  for (const [key, item] of Object.entries(row)) {
    const num = Number(item);
    if (Number.isFinite(num)) out[key] = num;
  }
  return out;
}

function clampPage(value: number | undefined, min: number, max: number, fallback: number) {
  if (value == null || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}
