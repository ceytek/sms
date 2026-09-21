import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

@Entity('inbox_notifications')
@Index('IDX_inbox_recipient_created', ['recipientCompanyId', 'createdAt'])
@Index('IDX_inbox_recipient_unread', ['recipientCompanyId', 'recipientUserId', 'readAt'])
export class InboxNotification extends BaseEntity {
  @Column({ name: 'recipient_company_id', type: 'uuid' })
  recipientCompanyId: string;

  @Column({ name: 'recipient_user_id', type: 'uuid', nullable: true })
  recipientUserId?: string;

  @Column({ name: 'event_type', length: 80 })
  eventType: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ length: 255, nullable: true })
  href?: string;

  @Column({ type: 'jsonb', nullable: true })
  payload?: Record<string, unknown>;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt?: Date;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId?: string;
}
