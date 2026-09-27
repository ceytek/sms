import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { SmsRecipientStatus } from '../../../common/enums/sms-recipient-status.enum.js';
import { SmsCampaign } from './sms-campaign.entity.js';
import { Company } from '../../companies/entities/company.entity.js';

@Entity('sms_campaign_recipients')
export class SmsCampaignRecipient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId: string;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId?: string;

  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId?: string;

  @Column({ name: 'subcategory_id', type: 'uuid', nullable: true })
  subcategoryId?: string;

  @Column({ name: 'source_type', length: 40, nullable: true })
  sourceType?: string;

  @Column({ name: 'display_name', length: 160, nullable: true })
  displayName?: string;

  @Column({ name: 'first_name', length: 80, nullable: true })
  firstName?: string;

  @Column({ name: 'last_name', length: 80, nullable: true })
  lastName?: string;

  @Column({ name: 'company_name', length: 255, nullable: true })
  companyName?: string;

  @Column({ name: 'mobile_raw', length: 40, nullable: true })
  mobileRaw?: string;

  @Column({ name: 'mobile_normalized', length: 20, nullable: true })
  mobileNormalized?: string;

  @Column({ type: 'enum', enum: SmsRecipientStatus, enumName: 'sms_recipient_status_enum' })
  status: SmsRecipientStatus;

  @Column({ name: 'exclude_reason', length: 80, nullable: true })
  excludeReason?: string;

  @Column({ name: 'consent_status', length: 30, nullable: true })
  consentStatus?: string;

  @Column({ name: 'rendered_body', type: 'text', nullable: true })
  renderedBody?: string;

  @Column({ length: 20, nullable: true })
  encoding?: string;

  @Column({ name: 'sms_parts', type: 'int', default: 1 })
  smsParts: number;

  @Column({ name: 'client_reference', length: 80, nullable: true })
  clientReference?: string;

  @Column({ name: 'batch_id', type: 'uuid', nullable: true })
  batchId?: string;

  @Column({ name: 'provider_message_id', length: 120, nullable: true })
  providerMessageId?: string;

  @Column({ name: 'provider_state', length: 40, nullable: true })
  providerState?: string;

  @Column({ name: 'send_attempt', type: 'int', default: 0 })
  sendAttempt: number;

  @Column({ name: 'claimed_at', type: 'timestamptz', nullable: true })
  claimedAt?: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt?: Date;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt?: Date;

  @Column({ name: 'last_error', length: 250, nullable: true })
  lastError?: string;

  @ManyToOne(() => SmsCampaign, (campaign) => campaign.recipients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: SmsCampaign;

  @ManyToOne(() => Company, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'company_id' })
  company?: Company;
}
