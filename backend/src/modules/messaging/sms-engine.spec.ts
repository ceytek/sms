import { describe, expect, it } from 'vitest';
import { hasPersonalization, renderSmsTemplate, smsEncodingAndParts } from './sms-text.js';
import {
  DELIVERY_ALLOWED_FROM,
  mapCallbackStatus,
  mapProviderItemState,
  normalizeWebhookPayload,
} from './sms-callback.js';
import { SmsRecipientStatus } from '../../common/enums/sms-recipient-status.enum.js';
import { DEFAULT_RATE_LIMITS, ProviderRateLimiter } from './queue/provider-rate-limiter.js';
import { extractPhonesFromMatrix } from './sms-file-phones.js';

describe('smsEncodingAndParts', () => {
  it('uses GSM-7 single part under 160', () => {
    expect(smsEncodingAndParts('Merhaba')).toEqual({ encoding: 'GSM7', parts: 1 });
  });

  it('uses UCS2 when Turkish special letters exist', () => {
    const result = smsEncodingAndParts('Şğİı');
    expect(result.encoding).toBe('UCS2');
    expect(result.parts).toBe(1);
  });
});

describe('personalization', () => {
  it('detects and renders tokens', () => {
    expect(hasPersonalization('Sayın {yetkili}, {firma}')).toBe(true);
    expect(renderSmsTemplate('Sayın {yetkili}', { firstName: 'Ali', lastName: 'Kaya' })).toBe(
      'Sayın Ali Kaya',
    );
  });
});

describe('callback mapping', () => {
  it('maps named statuses and ignores undocumented numeric provider states', () => {
    expect(mapCallbackStatus('DLVR')).toBe(SmsRecipientStatus.DELIVERED);
    expect(mapCallbackStatus('DELIVERED')).toBe(SmsRecipientStatus.DELIVERED);
    expect(mapCallbackStatus('6')).toBeNull();
    expect(mapCallbackStatus('4')).toBeNull();
    expect(mapCallbackStatus('-3')).toBeNull();
    expect(mapCallbackStatus('undeliv')).toBe(SmsRecipientStatus.FAILED);
    expect(mapCallbackStatus('unknown')).toBeNull();
  });

  it('does not allow delivered-to-accepted downgrade', () => {
    expect(DELIVERY_ALLOWED_FROM[SmsRecipientStatus.ACCEPTED]).not.toContain(SmsRecipientStatus.DELIVERED);
  });

  it('maps VoiceTelekom item states and ignores package states', () => {
    expect(mapProviderItemState('3')).toEqual({ status: SmsRecipientStatus.DELIVERED });
    expect(mapProviderItemState(2)?.status).toBe(SmsRecipientStatus.SENT);
    expect(mapProviderItemState('4')?.status).toBe(SmsRecipientStatus.FAILED);
    expect(mapProviderItemState('5')?.status).toBe(SmsRecipientStatus.EXPIRED);
    expect(mapProviderItemState('-1')?.status).toBe(SmsRecipientStatus.REJECTED);
    expect(mapProviderItemState('-2')?.status).toBe(SmsRecipientStatus.FAILED);
    expect(mapProviderItemState('0')).toBeNull();
    expect(mapProviderItemState('1')).toBeNull();
    expect(mapProviderItemState('6')).toBeNull();
    expect(mapProviderItemState('-3')).toBeNull();
  });

  it('reads customID and keeps raw provider state without mapping it', () => {
    expect(normalizeWebhookPayload({ customID: 'b.1.2', pkgID: 99, state: 6 })).toEqual({
      clientReference: 'b.1.2',
      customId: 'b.1.2',
      xid: undefined,
      messageId: '99',
      status: undefined,
      providerState: '6',
    });
  });
});

describe('rate limits', () => {
  it('splits batches by request, message and batch caps', () => {
    const limiter = Object.create(ProviderRateLimiter.prototype) as ProviderRateLimiter;
    const limits = limiter.normalize({
      requestPerSecond: 5,
      messagePerSecond: 20,
      maxBatchSize: 100,
      batchesPerSecond: 3,
    });
    expect(limits).toMatchObject({ requestPerSecond: 5, messagePerSecond: 20, maxBatchSize: 100, batchesPerSecond: 3 });
    expect(limiter.chunkSize(limits)).toBe(20);
    expect(limiter.chunkSize(DEFAULT_RATE_LIMITS)).toBe(50);
  });
});

describe('extractPhonesFromMatrix', () => {
  it('reads Telefon column from rehber export headers', () => {
    const phones = extractPhonesFromMatrix([
      ['Ad', 'Soyad', 'Telefon', 'Eposta', 'Firma', 'Gruplar', 'Etiketler', 'Kaynak', 'Durum'],
      ['', '', '0533 222 77 32', '', '', 'Eczacilar', '', 'BULK_NUMBERS', 'ACTIVE'],
      ['', '', '0533 111 22 33', '', '', 'Eczacilar', '', 'BULK_NUMBERS', 'ACTIVE'],
      ['Ceyhun', 'Tekin', '0532 000 00 20', '', '', 'Eczacilar', '', 'MANUAL', 'ACTIVE'],
    ]);
    expect(phones).toEqual(['0533 222 77 32', '0533 111 22 33', '0532 000 00 20']);
  });
});
