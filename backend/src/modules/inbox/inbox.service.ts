import { Inject, Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { InboxNotification } from './entities/inbox-notification.entity.js';
import { InboxQueryDto } from './dto/inbox-query.dto.js';
import {
  INBOX_COMPOSERS,
  type InboxComposer,
  type InboxPublishInput,
} from './composers/inbox-composer.js';

type Actor = { id: string; companyId: string };

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(
    @InjectRepository(InboxNotification)
    private readonly inboxRepository: Repository<InboxNotification>,
    @Inject(INBOX_COMPOSERS)
    private readonly composers: InboxComposer[],
  ) {}

  async publish(input: InboxPublishInput) {
    const composer = this.composers.find((item) => item.types.includes(input.type));
    if (!composer) {
      this.logger.warn(`Inbox composer yok: ${input.type}`);
      return { created: 0 };
    }

    const drafts = await composer.compose(input);
    let created = 0;
    for (const draft of drafts) {
      if (draft.recipientUserId && draft.recipientUserId === input.actorId) {
        continue;
      }
      await this.inboxRepository.save(
        this.inboxRepository.create({
          recipientCompanyId: draft.recipientCompanyId,
          recipientUserId: draft.recipientUserId,
          eventType: input.type,
          title: draft.title,
          body: draft.body,
          href: draft.href,
          payload: draft.payload,
          actorId: input.actorId,
          createdBy: input.actorId,
        }),
      );
      created += 1;
    }
    return { created };
  }

  async list(query: InboxQueryDto, actor: Actor) {
    this.assertActor(actor);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.inboxRepository
      .createQueryBuilder('item')
      .where('item.recipientCompanyId = :companyId', { companyId: actor.companyId })
      .andWhere('(item.recipientUserId IS NULL OR item.recipientUserId = :userId)', {
        userId: actor.id,
      })
      .orderBy('item.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      items: items.map((item) => this.serialize(item)),
      total,
      page,
      limit,
    };
  }

  async unreadCount(actor: Actor) {
    this.assertActor(actor);
    const count = await this.inboxRepository.count({
      where: [
        { recipientCompanyId: actor.companyId, recipientUserId: IsNull(), readAt: IsNull() },
        { recipientCompanyId: actor.companyId, recipientUserId: actor.id, readAt: IsNull() },
      ],
    });
    return { count };
  }

  async markRead(id: string, actor: Actor) {
    this.assertActor(actor);
    const item = await this.requireOwned(id, actor);
    if (!item.readAt) {
      item.readAt = new Date();
      item.updatedBy = actor.id;
      await this.inboxRepository.save(item);
    }
    return this.serialize(item);
  }

  async remove(id: string, actor: Actor) {
    this.assertActor(actor);
    const item = await this.requireOwned(id, actor);
    const wasUnread = !item.readAt;
    await this.inboxRepository.softRemove(item);
    return { id, unreadRemoved: wasUnread };
  }

  async markAllRead(actor: Actor) {
    this.assertActor(actor);
    await this.inboxRepository
      .createQueryBuilder()
      .update(InboxNotification)
      .set({ readAt: new Date(), updatedBy: actor.id })
      .where('recipient_company_id = :companyId', { companyId: actor.companyId })
      .andWhere('(recipient_user_id IS NULL OR recipient_user_id = :userId)', { userId: actor.id })
      .andWhere('read_at IS NULL')
      .execute();
    return { success: true };
  }

  private assertActor(actor: Actor) {
    if (!actor.companyId) {
      throw new ForbiddenException('Firma bilgisi bulunamadı');
    }
  }

  private async requireOwned(id: string, actor: Actor) {
    const item = await this.inboxRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Bildirim bulunamadı');
    }
    const sameCompany = item.recipientCompanyId === actor.companyId;
    const visible =
      sameCompany && (!item.recipientUserId || item.recipientUserId === actor.id);
    if (!visible) {
      throw new NotFoundException('Bildirim bulunamadı');
    }
    return item;
  }

  private serialize(item: InboxNotification) {
    return {
      id: item.id,
      eventType: item.eventType,
      title: item.title,
      body: item.body,
      href: item.href ?? null,
      payload: item.payload ?? null,
      readAt: item.readAt ?? null,
      createdAt: item.createdAt,
    };
  }
}
