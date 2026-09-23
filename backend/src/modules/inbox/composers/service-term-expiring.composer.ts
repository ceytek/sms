import { Injectable } from '@nestjs/common';
import { InboxEventType } from '../../../common/enums/inbox-event-type.enum.js';
import { toDateOnly } from '../../companies/service-term.js';
import type { InboxComposer, InboxDraft, InboxPublishInput } from './inbox-composer.js';

function formatTrDate(value?: string) {
  if (!value) return '';
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return `${Number(day)}.${Number(month)}.${year}`;
}

@Injectable()
export class ServiceTermExpiringComposer implements InboxComposer {
  readonly types = [InboxEventType.SERVICE_TERM_EXPIRING];

  async compose(input: InboxPublishInput): Promise<InboxDraft[]> {
    const ownerCompanyId = input.payload.ownerCompanyId;
    if (!ownerCompanyId) return [];

    const serviceName = input.payload.serviceName?.trim() || 'Hizmet';
    const customer = input.payload.customerName?.trim() || 'Firma';
    const code = input.payload.customerCode?.trim();
    const expires = formatTrDate(input.payload.expiresAt ? toDateOnly(String(input.payload.expiresAt)) : '');
    const daysLeft =
      typeof input.payload.daysLeft === 'number' ? input.payload.daysLeft : undefined;
    const daysLabel = daysLeft != null ? ` (${daysLeft} gün kaldı)` : '';
    const customerLabel = code ? `${customer} (${code})` : customer;

    const ownerHref = input.payload.ownerIsDealer
      ? `/admin/companies/${ownerCompanyId}`
      : '/customer';

    const drafts: InboxDraft[] = [
      {
        recipientCompanyId: String(ownerCompanyId),
        title: 'Hizmet vadesi yaklaşıyor',
        body: `${serviceName} hizmetinizin vadesi ${expires || 'yakında'} tarihinde doluyor.${daysLabel}`,
        href: ownerHref,
        payload: { ...input.payload, audience: 'OWNER' },
      },
    ];

    const dealerCompanyId = input.payload.dealerCompanyId
      ? String(input.payload.dealerCompanyId)
      : undefined;
    if (dealerCompanyId && dealerCompanyId !== String(ownerCompanyId)) {
      drafts.push({
        recipientCompanyId: dealerCompanyId,
        title: 'Müşteri hizmet vadesi yaklaşıyor',
        body: `${customerLabel} müşterisinin ${serviceName} hizmetinin vadesi ${expires || 'yakında'} tarihinde doluyor.${daysLabel}`,
        href: `/admin/companies/${ownerCompanyId}`,
        payload: { ...input.payload, audience: 'DEALER' },
      });
    }

    return drafts;
  }
}
