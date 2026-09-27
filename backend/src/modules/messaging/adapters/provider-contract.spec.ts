import { describe, expect, it } from 'vitest';
import {
  batchCustomId,
  chooseProviderSendMode,
  mapAppEncodingToProvider,
  toProviderCustomId,
  toProviderTitle,
  toProviderValidity,
  toProviderXid,
} from './provider-ids.js';
import { KOCAELI_API_PATHS } from './kocaeli-paths.js';
import { basicAuthorizationHeader } from './provider-http.client.js';
import { classifyProviderError, CUSTOM_ID_DUPLICATION_CODE } from './provider-errors.js';

describe('provider customID', () => {
  it('keeps letters, digits, hyphen and dot under 100 chars', () => {
    expect(toProviderCustomId('batch:abc-def:12')).toBe('batch-abc-def-12');
    expect(toProviderCustomId('a'.repeat(140)).length).toBe(100);
  });

  it('builds deterministic batch ids without colons', () => {
    const id = batchCustomId('11111111-1111-1111-1111-111111111111', 3);
    expect(id).toBe('b.11111111-1111-1111-1111-111111111111.3');
    expect(id.length).toBeLessThanOrEqual(100);
  });

  it('keeps xid at 32 chars', () => {
    expect(toProviderXid('11111111-1111-1111-1111-111111111111')).toBe('11111111111111111111111111111111');
    expect(toProviderXid('11111111-1111-1111-1111-111111111111').length).toBe(32);
  });
});

describe('encoding mapping', () => {
  it('maps application encodings to provider integers', () => {
    expect(mapAppEncodingToProvider('GSM7')).toBe(0);
    expect(mapAppEncodingToProvider('DEFAULT')).toBe(0);
    expect(mapAppEncodingToProvider('TURKISH')).toBe(1);
    expect(mapAppEncodingToProvider('UCS2')).toBe(2);
    expect(mapAppEncodingToProvider('UNICODE')).toBe(2);
  });
});

describe('send mode', () => {
  it('uses single, bulk or dynamic from message equality', () => {
    expect(chooseProviderSendMode([{ body: 'a' }])).toBe('single');
    expect(chooseProviderSendMode([{ body: 'a' }, { body: 'a' }])).toBe('bulk');
    expect(chooseProviderSendMode([{ body: 'a' }, { body: 'b' }])).toBe('dynamic');
  });
});

describe('title and validity', () => {
  it('pads short titles and defaults validity to 1440', () => {
    expect(toProviderTitle('AB').length).toBeGreaterThanOrEqual(5);
    expect(toProviderTitle('ORIGINATOR11')).toBe('ORIGINATOR11');
    expect(toProviderValidity(undefined)).toBe(1440);
    expect(toProviderValidity(10)).toBe(60);
    expect(toProviderValidity(2000)).toBe(1440);
  });
});

describe('error classification', () => {
  it('treats maintenance and concurrent limit as retryable', () => {
    expect(classifyProviderError({ code: 'ERR_SYSTEM_MAINTENANCE', status: 503 }).retryable).toBe(true);
    const concurrent = classifyProviderError({ code: 'ERR_CONCURRENT_REQUEST_LIMIT', status: 400 });
    expect(concurrent.retryable).toBe(true);
    expect(concurrent.cooldownMs).toBe(60_000);
  });

  it('treats customID duplication as reconcile, 30min dup as permanent', () => {
    const dup = classifyProviderError({ code: CUSTOM_ID_DUPLICATION_CODE });
    expect(dup.reconcileCustomId).toBe(true);
    expect(dup.retryable).toBe(false);
    expect(classifyProviderError({ code: 'ERR_SMS_PKG_DUPLICATION' }).retryable).toBe(false);
    expect(classifyProviderError({ code: 'ERR_INVALID_SMS_SENDER' }).retryable).toBe(false);
    expect(classifyProviderError({ code: 'ERR_USER_CREDIT_REQUIRED' }).retryable).toBe(false);
    expect(classifyProviderError({ code: 'ERR_UNAUTHORIZED_REQUEST' }).message).toMatch(/gerçek hesabı/i);
  });
});

describe('documented provider paths', () => {
  it('uses path-only endpoints and never query-string credentials', () => {
    expect(KOCAELI_API_PATHS).toEqual({
      send: '/sms/create',
      report: '/sms/list',
      detailReport: '/sms/list-item',
      summary: '/sms/summary',
      senders: '/sms/list-sender',
      gateways: '/sms/list-gateway',
      credit: '/user/credit',
    });
    const serialized = JSON.stringify(KOCAELI_API_PATHS);
    expect(serialized).not.toMatch(/direct/i);
    expect(serialized).not.toMatch(/sifre|kullanici|voicetelekom|smsvt/i);
  });
});

describe('Basic Authentication header', () => {
  it('encodes username:password as documented (never query-string)', () => {
    expect(basicAuthorizationHeader('smsuser', 'p4r0la')).toBe('Basic c21zdXNlcjpwNHIwbGE=');
  });
});
