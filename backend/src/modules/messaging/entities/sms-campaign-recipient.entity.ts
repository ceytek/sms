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

  @Column({ name: 'subcategory_id', type: 'uuid', nullable: true })
  subcategoryId?: string;

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

  @Column({ name: 'provider_message_id', length: 120, nullable: true })
  providerMessageId?: string;

  @ManyToOne(() => SmsCampaign, (campaign) => campaign.recipients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: SmsCampaign;

  @ManyToOne(() => Company, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'company_id' })
  company?: Company;
}
