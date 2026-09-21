import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { NotificationPurpose } from '../../../common/enums/notification-purpose.enum.js';
import { NotificationChannel } from '../../../common/enums/notification-channel.enum.js';
import { NotificationDispatchStatus } from '../../../common/enums/notification-dispatch-status.enum.js';
import { Company } from '../../companies/entities/company.entity.js';

@Entity('notification_dispatches')
export class NotificationDispatch extends BaseEntity {
  @Index()
  @Column({ name: 'sender_company_id', type: 'uuid' })
  senderCompanyId: string;

  @Index()
  @Column({ name: 'target_company_id', type: 'uuid' })
  targetCompanyId: string;

  @Column({ type: 'enum', enum: NotificationPurpose, enumName: 'notification_purpose_enum' })
  purpose: NotificationPurpose;

  @Column({ type: 'enum', enum: NotificationChannel, enumName: 'notification_channel_enum' })
  channel: NotificationChannel;

  @Column({ length: 255 })
  recipient: string;

  @Column({
    type: 'enum',
    enum: NotificationDispatchStatus,
    enumName: 'notification_dispatch_status_enum',
    default: NotificationDispatchStatus.MOCK_SENT,
  })
  status: NotificationDispatchStatus;

  @Column({ name: 'provider_name', length: 80 })
  providerName: string;

  @Column({ name: 'provider_message_id', length: 120, nullable: true })
  providerMessageId?: string;

  @Column({ name: 'error_message', length: 500, nullable: true })
  errorMessage?: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_company_id' })
  senderCompany: Company;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_company_id' })
  targetCompany: Company;
}
