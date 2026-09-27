export const RETRYABLE_PROVIDER_CODES = new Set([
  'ERR_SYSTEM_MAINTENANCE',
  'ERR_INTERNAL_SERVER',
  'ERR_CONCURRENT_REQUEST_LIMIT',
  'ERR_DAILY_REQUEST_LIMIT',
]);

export const PERMANENT_PROVIDER_CODES = new Set([
  'ERR_BAD_REQUEST',
  'ERR_INVALID_PARAM',
  'ERR_UNAUTHORIZED_REQUEST',
  'ERR_USER_NOT_AUTHORIZED',
  'ERR_INVALID_SMS_SENDER',
  'ERR_EMPTY_SMS_PACKAGE',
  'ERR_INVALID_SMS_SENDING_DATE',
  'ERR_USER_CREDIT_REQUIRED',
  'ERR_PARENT_USER_CREDIT_REQUIRED',
  'ERR_USER_BRAND_CODE_NOT_FOUND',
  'ERR_USER_IYS_SETTINGS_NOT_FOUND',
  'ERR_INVALID_PRICING_PLAN',
  'ERR_CREDIT_PLAN_NOT_FOUND',
  'ERR_USER_NOT_FOUND',
  'ERR_SMS_PKG_DUPLICATION',
]);

export const CUSTOM_ID_DUPLICATION_CODE = 'ERR_SMS_PKG_CUSTOM_ID_DUPLICATION';
export const CONCURRENT_LIMIT_CODE = 'ERR_CONCURRENT_REQUEST_LIMIT';

const PROVIDER_ERROR_MESSAGES: Record<string, string> = {
  ERR_UNAUTHORIZED_REQUEST:
    'VoiceTelekom kullanıcı adı veya şifre reddedildi. API dokümanındaki smsuser örneği değil, paneldeki gerçek hesabı kaydedin.',
  ERR_USER_NOT_AUTHORIZED: 'Bu VoiceTelekom kullanıcısının gönderim yetkisi yok.',
  ERR_INVALID_SMS_SENDER: 'Bu SMS başlığı VoiceTelekom hesabında tanımlı değil.',
  ERR_USER_CREDIT_REQUIRED: 'VoiceTelekom hesabında kredi yok.',
  ERR_PARENT_USER_CREDIT_REQUIRED: 'Üst VoiceTelekom hesabında kredi yok.',
  ERR_USER_NOT_FOUND: 'VoiceTelekom kullanıcısı bulunamadı.',
};

export type ClassifiedProviderError = {
  code: string;
  message: string;
  retryable: boolean;
  cooldownMs?: number;
  reconcileCustomId?: boolean;
};

export function classifyProviderError(input: {
  code?: string;
  status?: number;
  message?: string;
}): ClassifiedProviderError {
  const code = (input.code || (input.status != null ? `HTTP_${input.status}` : 'UNKNOWN')).toUpperCase();
  const mapped = PROVIDER_ERROR_MESSAGES[code];
  const raw = input.message || code;
  const message = mapped || raw;
  if (code === CUSTOM_ID_DUPLICATION_CODE) {
    return { code, message, retryable: false, reconcileCustomId: true };
  }
  if (code === CONCURRENT_LIMIT_CODE) {
    return { code, message, retryable: true, cooldownMs: 60_000 };
  }
  if (RETRYABLE_PROVIDER_CODES.has(code) || isRetryableHttpStatus(input.status)) {
    return { code, message, retryable: true, cooldownMs: 15_000 };
  }
  if (PERMANENT_PROVIDER_CODES.has(code)) {
    return { code, message, retryable: false };
  }
  if (input.status != null && input.status >= 400 && input.status < 500) {
    return { code, message, retryable: false };
  }
  return { code, message, retryable: false };
}

export function isRetryableHttpStatus(status?: number) {
  return status === 408 || status === 429 || status === 502 || status === 503 || status === 504 || (status != null && status >= 500);
}
