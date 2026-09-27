export type SmsContentEncoding = 'DEFAULT' | 'TURKISH' | 'UNICODE';

export type ProviderSendItem = {
  to: string;
  body: string;
  clientReference: string;
  originator: string;
  recipientId?: string;
};

export type ProviderSendResultItem = {
  clientReference: string;
  accepted: boolean;
  providerMessageId?: string;
  error?: string;
  retryable?: boolean;
  rawCode?: string;
};

export type ProviderSendResult = {
  provider: string;
  mock: boolean;
  items: ProviderSendResultItem[];
  providerBatchId?: string;
};

export type ProviderDeliveryStatus = 'ACCEPTED' | 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'EXPIRED' | 'REJECTED';

export type ProviderQueryResult = {
  clientReference: string;
  status: ProviderDeliveryStatus;
  providerMessageId?: string;
  providerState?: string;
  error?: string;
};

export type ProviderCallConfig = {
  baseUrl?: string;
  timeoutMs?: number;
  sendPath?: string;
  summaryPath?: string;
  creditPath?: string;
  creditMethod?: 'GET' | 'POST';
  sendersPath?: string;
  gatewaysPath?: string;
  reportPath?: string;
  detailReportPath?: string;
  gateway?: string;
  commercial?: boolean;
  skipAhsQuery?: boolean;
  recipientAudience?: 'INDIVIDUAL' | 'TRADER' | 'BOTH';
  title?: string;
  encoding?: SmsContentEncoding;
  packageCustomId?: string;
  validityMinutes?: number;
};

export type ProviderCallContext = {
  credentials: Record<string, string>;
  config?: ProviderCallConfig;
};

export type SmsReportQuery = {
  packageIds?: string[];
  customIds?: string[];
  keyword?: string;
  sender?: string;
  startDate?: string;
  finishDate?: string;
  pageIndex?: number;
  pageSize?: number;
};

export type SmsDetailReportQuery = {
  packageId?: string;
  customId?: string;
  target?: string;
  pageIndex?: number;
  pageSize?: number;
};

export type SmsSummaryQuery = {
  startDate: string;
  finishDate: string;
};

export type ProviderSender = {
  uuid: string;
  title: string;
  status?: string;
  gateways: string[];
};

export type ProviderGateway = {
  uuid: string;
  senders: string[];
  raw?: Record<string, unknown>;
};

export type ProviderSmsReport = {
  id?: string;
  customId?: string;
  title?: string;
  content?: string;
  providerState?: string;
  statistics?: Record<string, number>;
  raw?: Record<string, unknown>;
};

export type ProviderSmsDetail = {
  target?: string;
  xid?: string;
  msg?: string;
  providerState?: string;
  sender?: string;
  credit?: number;
  raw?: Record<string, unknown>;
};

export interface SmsProviderAdapter {
  code: string;
  sendBatch(input: {
    originator: string;
    items: ProviderSendItem[];
    credentials: Record<string, string>;
    config?: ProviderCallConfig;
  }): Promise<ProviderSendResult>;
  sendSingle(input: {
    originator: string;
    item: ProviderSendItem;
    credentials: Record<string, string>;
    config?: ProviderCallConfig;
  }): Promise<ProviderSendResult>;
  sendBulk(input: {
    originator: string;
    items: ProviderSendItem[];
    credentials: Record<string, string>;
    config?: ProviderCallConfig;
  }): Promise<ProviderSendResult>;
  sendDynamic(input: {
    originator: string;
    items: ProviderSendItem[];
    credentials: Record<string, string>;
    config?: ProviderCallConfig;
  }): Promise<ProviderSendResult>;
  queryByReference(
    clientReference: string,
    ctx?: ProviderCallContext,
  ): Promise<ProviderQueryResult | null>;
  getSmsReport(query: SmsReportQuery, ctx: ProviderCallContext): Promise<ProviderSmsReport[]>;
  getSmsDetailReport(query: SmsDetailReportQuery, ctx: ProviderCallContext): Promise<ProviderSmsDetail[]>;
  getSmsSummary(
    query: SmsSummaryQuery,
    ctx: ProviderCallContext,
  ): Promise<Record<string, number>>;
  getSenders(ctx: ProviderCallContext): Promise<ProviderSender[]>;
  getGateways(ctx: ProviderCallContext): Promise<ProviderGateway[]>;
  getCredit(ctx: ProviderCallContext): Promise<number>;
}

export class RetryableProviderError extends Error {
  readonly rawCode?: string;
  readonly cooldownMs?: number;

  constructor(message: string, rawCode?: string, cooldownMs?: number) {
    super(message);
    this.name = 'RetryableProviderError';
    this.rawCode = rawCode;
    this.cooldownMs = cooldownMs;
  }
}

export class PermanentProviderError extends Error {
  readonly rawCode?: string;

  constructor(message: string, rawCode?: string) {
    super(message);
    this.name = 'PermanentProviderError';
    this.rawCode = rawCode;
  }
}

export class ProviderPathNotConfiguredError extends PermanentProviderError {
  constructor(service: string) {
    super(`${service} HTTP yolu henuz dogrulanmadi`);
    this.name = 'ProviderPathNotConfiguredError';
  }
}
