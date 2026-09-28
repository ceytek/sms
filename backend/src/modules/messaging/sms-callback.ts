import { SmsRecipientStatus } from '../../common/enums/sms-recipient-status.enum.js';

export function mapCallbackStatus(status?: string): SmsRecipientStatus | null {
  if (status === undefined || status === null || status === '') return null;
  const value = String(status).trim().toUpperCase();
  if (value === 'DELIVERED' || value === 'DLVR') return SmsRecipientStatus.DELIVERED;
  if (value === 'SENT') return SmsRecipientStatus.SENT;
  if (value === 'FAILED' || value === 'UNDELIV' || value === 'UNDELIVERED') return SmsRecipientStatus.FAILED;
  if (value === 'EXPIRED') return SmsRecipientStatus.EXPIRED;
  if (value === 'REJECTED') return SmsRecipientStatus.REJECTED;
  if (value === 'ACCEPTED' || value === 'PENDING') return SmsRecipientStatus.ACCEPTED;
  return null;
}

/** VoiceTelekom item states. Package states (4, 6, -3, …) stay unmapped. */
export function mapProviderItemState(state?: string | number | null): {
  status: SmsRecipientStatus;
  error?: string;
} | null {
  if (state === undefined || state === null || state === '') return null;
  const value = String(state).trim();
  if (value === '2') return { status: SmsRecipientStatus.SENT };
  if (value === '3') return { status: SmsRecipientStatus.DELIVERED };
  if (value === '4') return { status: SmsRecipientStatus.FAILED, error: 'Numaraya iletilemedi' };
  if (value === '5') return { status: SmsRecipientStatus.EXPIRED, error: 'Zamanaşımına uğradı' };
  if (value === '-1') return { status: SmsRecipientStatus.REJECTED, error: 'Operatör tarafından reddedildi' };
  if (value === '-2') return { status: SmsRecipientStatus.FAILED, error: 'İptal edildi' };
  return null;
}

export function normalizeWebhookPayload(body: Record<string, unknown>) {
  const nested = (body.data && typeof body.data === 'object' ? body.data : body) as Record<string, unknown>;
  const clientReference = firstString(
    nested.clientReference,
    nested.customID,
    nested.customId,
    nested.xid,
  );
  const customId = firstString(nested.customID, nested.customId);
  const xid = firstString(nested.xid);
  const messageId = firstString(nested.messageId, nested.pkgID, nested.pkgId, nested.PackageId);
  const status = firstString(nested.status);
  const providerState = firstString(nested.state, nested.State, nested.setState);
  return { clientReference, customId, xid, messageId, status, providerState };
}

export function xidToRecipientId(xid?: string) {
  const hex = String(xid || '').replace(/-/g, '');
  if (!/^[A-Fa-f0-9]{32}$/.test(hex)) return undefined;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`.toLowerCase();
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (value === undefined || value === null || value === '') continue;
    return String(value);
  }
  return undefined;
}

export const DELIVERY_ALLOWED_FROM: Partial<Record<SmsRecipientStatus, SmsRecipientStatus[]>> = {
  [SmsRecipientStatus.ACCEPTED]: [
    SmsRecipientStatus.PROCESSING,
    SmsRecipientStatus.INCLUDED,
    SmsRecipientStatus.QUEUED,
  ],
  [SmsRecipientStatus.SENT]: [
    SmsRecipientStatus.PROCESSING,
    SmsRecipientStatus.ACCEPTED,
    SmsRecipientStatus.INCLUDED,
    SmsRecipientStatus.QUEUED,
  ],
  [SmsRecipientStatus.DELIVERED]: [
    SmsRecipientStatus.PROCESSING,
    SmsRecipientStatus.ACCEPTED,
    SmsRecipientStatus.SENT,
    SmsRecipientStatus.INCLUDED,
    SmsRecipientStatus.QUEUED,
  ],
  [SmsRecipientStatus.FAILED]: [
    SmsRecipientStatus.PROCESSING,
    SmsRecipientStatus.ACCEPTED,
    SmsRecipientStatus.SENT,
    SmsRecipientStatus.QUEUED,
    SmsRecipientStatus.INCLUDED,
  ],
  [SmsRecipientStatus.EXPIRED]: [
    SmsRecipientStatus.PROCESSING,
    SmsRecipientStatus.ACCEPTED,
    SmsRecipientStatus.SENT,
  ],
  [SmsRecipientStatus.REJECTED]: [
    SmsRecipientStatus.PROCESSING,
    SmsRecipientStatus.ACCEPTED,
    SmsRecipientStatus.SENT,
    SmsRecipientStatus.INCLUDED,
    SmsRecipientStatus.QUEUED,
  ],
};
