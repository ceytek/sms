import { InboxEventType } from '../../../common/enums/inbox-event-type.enum.js';

export const INBOX_COMPOSERS = 'INBOX_COMPOSERS';

export type InboxEventPayload = {
  originatorId?: string;
  originatorName?: string;
  dealerName?: string;
  dealerCompanyId?: string;
  customerName?: string;
  customerCode?: string;
  requesterUserId?: string;
  requesterCompanyId?: string;
  requesterUsername?: string;
  ownerCompanyId?: string;
  ownerIsDealer?: boolean;
  previousStatus?: string;
  actorCompanyId?: string;
  [key: string]: unknown;
};

export type InboxPublishInput = {
  type: InboxEventType;
  actorId: string;
  payload: InboxEventPayload;
};

export type InboxDraft = {
  recipientCompanyId: string;
  recipientUserId?: string;
  title: string;
  body: string;
  href?: string;
  payload?: Record<string, unknown>;
};

export interface InboxComposer {
  readonly types: InboxEventType[];
  compose(input: InboxPublishInput): Promise<InboxDraft[]>;
}
