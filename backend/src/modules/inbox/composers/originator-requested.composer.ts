import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InboxEventType } from '../../../common/enums/inbox-event-type.enum.js';
import { Company } from '../../companies/entities/company.entity.js';
import { User } from '../../auth/entities/user.entity.js';
import type { InboxComposer, InboxDraft, InboxPublishInput } from './inbox-composer.js';

@Injectable()
export class OriginatorRequestedComposer implements InboxComposer {
  readonly types = [InboxEventType.ORIGINATOR_REQUESTED];

  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async compose(input: InboxPublishInput): Promise<InboxDraft[]> {
    const admin = await this.companyRepository.findOne({
      where: { companyCode: 'ADMIN' },
    });
    if (!admin) return [];

    const dealer = input.payload.dealerName?.trim() || 'Bir bayi';
    const originator = input.payload.originatorName?.trim() || 'bir originatör';
    const customer = input.payload.customerName?.trim();
    const customerCode = input.payload.customerCode?.trim();
    const requesterId = input.payload.requesterUserId || input.actorId;
    const requester = requesterId
      ? await this.userRepository.findOne({ where: { id: requesterId } })
      : null;
    const requesterUsername = requester?.username?.trim();
    const customerLabel = customer
      ? `${customer}${customerCode ? ` (${customerCode})` : ''}`
      : 'müşterisi';
    const who = requesterUsername ? `${requesterUsername} (${dealer})` : dealer;

    return [
      {
        recipientCompanyId: admin.id,
        title: 'Originatör talebi',
        body: `${who}, ${customerLabel} için ${originator} başlığını talep etti.`,
        href: '/admin/originators/requests',
        payload: {
          ...input.payload,
          requesterUsername,
        },
      },
    ];
  }
}
