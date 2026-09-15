import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { SmsSendType } from '../../../common/enums/sms-send-type.enum.js';
import { SmsAudienceSource } from '../../../common/enums/sms-audience-source.enum.js';
import { SmsCampaignStatus } from '../../../common/enums/sms-campaign-status.enum.js';
import { Company } from '../../companies/entities/company.entity.js';
import type { SmsCampaignSegment } from './sms-campaign-segment.entity.js';
import type { SmsCampaignRecipient } from './sms-campaign-recipient.entity.js';

@Entity('sms_campaigns')
export class SmsCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sender_company_id', type: 'uuid' })
  senderCompanyId: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'send_type', type: 'enum', enum: SmsSendType, enumName: 'sms_send_type_enum' })
  sendType: SmsSendType;

  @Column({
    name: 'audience_source',
    type: 'enum',
    enum: SmsAudienceSource,
    enumName: 'sms_audience_source_enum',
  })
  audienceSource: SmsAudienceSource;

  @Column({
    type: 'enum',
    enum: SmsCampaignStatus,
    enumName: 'sms_campaign_status_enum',
    default: SmsCampaignStatus.DRAFT,
  })
  status: SmsCampaignStatus;

  @Column({ type: 'text' })
  body: string;

  @Column({ length: 20, default: 'GSM7' })
  encoding: string;

  @Column({ name: 'sms_parts', type: 'int', default: 1 })
  smsParts: number;

  @Column({ name: 'estimated_units', type: 'int', default: 0 })
  estimatedUnits: number;

  @Column({ name: 'originator_id', type: 'uuid', nullable: true })
  originatorId?: string;

  @Column({ name: 'provider_id', type: 'uuid', nullable: true })
  providerId?: string;

  @Column({ name: 'is_mock', default: true })
  isMock: boolean;

  @Column({ name: 'company_count', type: 'int', default: 0 })
  companyCount: number;

  @Column({ name: 'valid_recipient_count', type: 'int', default: 0 })
  validRecipientCount: number;

  @Column({ name: 'invalid_count', type: 'int', default: 0 })
  invalidCount: number;

  @Column({ name: 'duplicate_count', type: 'int', default: 0 })
  duplicateCount: number;

  @Column({ name: 'excluded_count', type: 'int', default: 0 })
  excludedCount: number;

  @Column({ name: 'success_count', type: 'int', default: 0 })
  successCount: number;

  @Column({ name: 'fail_count', type: 'int', default: 0 })
  failCount: number;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sender_company_id' })
  senderCompany: Company;

  @OneToMany('SmsCampaignSegment', 'campaign')
  segments: SmsCampaignSegment[];

  @OneToMany('SmsCampaignRecipient', 'campaign')
  recipients: SmsCampaignRecipient[];
}
