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
import type { SmsCampaignSource } from './sms-campaign-source.entity.js';
import type { SmsCampaignBatch } from './sms-campaign-batch.entity.js';

@Entity('sms_campaigns')
export class SmsCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sender_company_id', type: 'uuid' })
  senderCompanyId: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'idempotency_key', length: 80, nullable: true })
  idempotencyKey?: string;

  @Column({ length: 120, nullable: true })
  name?: string;

  @Column({ length: 40, nullable: true })
  category?: string;

  @Column({ length: 20, default: 'BULK' })
  composition: string;

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

  @Column({ name: 'actual_units', type: 'int', default: 0 })
  actualUnits: number;

  @Column({ name: 'reserved_units', type: 'int', default: 0 })
  reservedUnits: number;

  @Column({ name: 'reservation_tx_id', type: 'uuid', nullable: true })
  reservationTxId?: string;

  @Column({ name: 'originator_id', type: 'uuid', nullable: true })
  originatorId?: string;

  @Column({ name: 'originator_name', length: 20, nullable: true })
  originatorName?: string;

  @Column({ name: 'provider_id', type: 'uuid', nullable: true })
  providerId?: string;

  @Column({ name: 'sms_account_id', type: 'uuid', nullable: true })
  smsAccountId?: string;

  @Column({ name: 'is_mock', default: true })
  isMock: boolean;

  @Column({ name: 'kvkk_check_enabled', default: false })
  kvkkCheckEnabled: boolean;

  @Column({ name: 'company_count', type: 'int', default: 0 })
  companyCount: number;

  @Column({ name: 'raw_recipient_count', type: 'int', default: 0 })
  rawRecipientCount: number;

  @Column({ name: 'valid_recipient_count', type: 'int', default: 0 })
  validRecipientCount: number;

  @Column({ name: 'invalid_count', type: 'int', default: 0 })
  invalidCount: number;

  @Column({ name: 'duplicate_count', type: 'int', default: 0 })
  duplicateCount: number;

  @Column({ name: 'excluded_count', type: 'int', default: 0 })
  excludedCount: number;

  @Column({ name: 'blacklist_count', type: 'int', default: 0 })
  blacklistCount: number;

  @Column({ name: 'consent_excluded_count', type: 'int', default: 0 })
  consentExcludedCount: number;

  @Column({ name: 'passive_count', type: 'int', default: 0 })
  passiveCount: number;

  @Column({ name: 'queued_count', type: 'int', default: 0 })
  queuedCount: number;

  @Column({ name: 'processing_count', type: 'int', default: 0 })
  processingCount: number;

  @Column({ name: 'accepted_count', type: 'int', default: 0 })
  acceptedCount: number;

  @Column({ name: 'delivered_count', type: 'int', default: 0 })
  deliveredCount: number;

  @Column({ name: 'success_count', type: 'int', default: 0 })
  successCount: number;

  @Column({ name: 'fail_count', type: 'int', default: 0 })
  failCount: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string;

  @Column({ name: 'file_path', length: 500, nullable: true })
  filePath?: string;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt?: Date;

  @Column({ name: 'prepared_at', type: 'timestamptz', nullable: true })
  preparedAt?: Date;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt?: Date;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt?: Date;

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

  @OneToMany('SmsCampaignSource', 'campaign')
  sources: SmsCampaignSource[];

  @OneToMany('SmsCampaignBatch', 'campaign')
  batches: SmsCampaignBatch[];
}
