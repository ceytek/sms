/**
 * Documented HTTP paths only. Host lives in admin provider config, never in source.
 * DirectSms GET /direct/?cmd=sendsms&kullanici=&sifre= is intentionally unused
 * because it puts the password in the query string.
 */
export const KOCAELI_API_PATHS = {
  send: '/sms/create',
  report: '/sms/list',
  detailReport: '/sms/list-item',
  summary: '/sms/summary',
  senders: '/sms/list-sender',
  gateways: '/sms/list-gateway',
  credit: '/user/credit',
} as const;

export const KOCAELI_API_METHODS = {
  send: 'POST',
  report: 'POST',
  detailReport: 'POST',
  summary: 'POST',
  senders: 'POST',
  gateways: 'GET',
  credit: 'GET',
} as const;
