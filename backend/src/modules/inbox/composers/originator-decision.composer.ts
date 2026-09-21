import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InboxEventType } from '../../../common/enums/inbox-event-type.enum.js';
import { Role } from '../../../common/enums/role.enum.js';
import { OriginatorStatus } from '../../../common/enums/originator-status.enum.js';
import { User } from '../../auth/entities/user.entity.js';
import type { InboxComposer, InboxDraft, InboxPublishInput } from './inbox-composer.js';

function copyFor(
  type: InboxEventType,
  previousStatus?: string,
): { title: string; action: string } | null {
  if (type === InboxEventType.ORIGINATOR_APPROVED) {
    if (previousStatus === OriginatorStatus.PASSIVE) {
      return { title: 'Originatör aktif edildi', action: 'yeniden aktif edildi' };
    }
    return { title: 'Originatör onaylandı', action: 'onaylandı ve aktif edildi' };
  }
  if (type === InboxEventType.ORIGINATOR_PASSIVATED) {
    return { title: 'Originatör pasife alındı', action: 'pasife alındı' };
  }
  if (type === InboxEventType.ORIGINATOR_BANNED) {
    return { title: 'Originatör yasaklandı', action: 'yasaklandı' };
  }
  return null;
}

@Injectable()
export class OriginatorDecisionComposer implements InboxComposer {
  readonly types = [
    InboxEventType.ORIGINATOR_APPROVED,
    InboxEventType.ORIGINATOR_PASSIVATED,
    InboxEventType.ORIGINATOR_BANNED,
  ];

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async compose(input: InboxPublishInput): Promise<InboxDraft[]> {
    const copy = copyFor(input.type, input.payload.previousStatus);
    if (!copy) return [];

    const originator = input.payload.originatorName?.trim() || 'Başlık';
    const customer = input.payload.customerName?.trim();
    const body = customer
      ? `${originator} başlığı ${copy.action}. (${customer})`
      : `${originator} başlığı ${copy.action}.`;

    const recipientCompanyId = this.resolveRecipientCompanyId(input);
    if (!recipientCompanyId || recipientCompanyId === input.payload.actorCompanyId) {
      return [];
    }

    const requester = input.payload.requesterUserId
      ? await this.userRepository.findOne({ where: { id: input.payload.requesterUserId } })
      : null;
    const recipientUserId =
      requester?.role === Role.DEALER && requester.companyId === recipientCompanyId
        ? requester.id
        : undefined;

    return [
      {
        recipientCompanyId,
        recipientUserId,
        title: copy.title,
        body,
        href: '/admin/originators',
        payload: input.payload,
      },
    ];
  }

  private resolveRecipientCompanyId(input: InboxPublishInput) {
    if (input.payload.ownerIsDealer && input.payload.ownerCompanyId) {
      return String(input.payload.ownerCompanyId);
    }
    if (input.payload.dealerCompanyId) {
      return String(input.payload.dealerCompanyId);
    }
    if (input.payload.requesterCompanyId) {
      return String(input.payload.requesterCompanyId);
    }
    return undefined;
  }
}
