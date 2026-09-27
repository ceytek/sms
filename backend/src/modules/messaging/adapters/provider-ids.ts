const CUSTOM_ID_MAX = 100;
const XID_MAX = 32;
const TITLE_MIN = 5;
const TITLE_MAX = 50;
const VALIDITY_MIN = 60;
const VALIDITY_MAX = 1440;
const VALIDITY_DEFAULT = 1440;

export function toProviderCustomId(value: string, max = CUSTOM_ID_MAX): string {
  const cleaned = String(value || '')
    .replace(/[^A-Za-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return (cleaned || 'ref').slice(0, max);
}

export function toProviderXid(value: string): string {
  const hex = String(value || '').replace(/-/g, '').replace(/[^A-Za-z0-9]/g, '');
  if (hex) return hex.slice(0, XID_MAX);
  return toProviderCustomId(value, XID_MAX);
}

export function toProviderTitle(originator: string, fallback = 'SMS'): string {
  const sender = String(originator || fallback).trim() || fallback;
  if (sender.length >= TITLE_MIN) return sender.slice(0, TITLE_MAX);
  return `${fallback}.${sender}`.slice(0, TITLE_MAX).padEnd(TITLE_MIN, '.');
}

export function toProviderValidity(minutes?: number): number {
  if (minutes == null || !Number.isFinite(minutes)) return VALIDITY_DEFAULT;
  return Math.min(VALIDITY_MAX, Math.max(VALIDITY_MIN, Math.round(minutes)));
}

export function mapAppEncodingToProvider(encoding?: string): 0 | 1 | 2 {
  const value = String(encoding || 'DEFAULT').toUpperCase();
  if (value === 'TURKISH') return 1;
  if (value === 'UNICODE' || value === 'UCS2' || value === 'UTF8' || value === 'UTF-8') return 2;
  return 0;
}

export function toSmsContentEncoding(encoding?: string): 'DEFAULT' | 'TURKISH' | 'UNICODE' {
  const mapped = mapAppEncodingToProvider(encoding);
  if (mapped === 1) return 'TURKISH';
  if (mapped === 2) return 'UNICODE';
  return 'DEFAULT';
}

export function chooseProviderSendMode(items: Array<{ body: string }>): 'single' | 'bulk' | 'dynamic' {
  if (items.length <= 1) return 'single';
  const first = items[0]?.body;
  return items.every((item) => item.body === first) ? 'bulk' : 'dynamic';
}

export function batchCustomId(campaignId: string, sequence: number): string {
  return toProviderCustomId(`b.${campaignId}.${sequence}`);
}
