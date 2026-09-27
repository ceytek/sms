import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SmsBatchStatus } from '../../../common/enums/sms-batch-status.enum.js';
import { SmsCampaign } from './sms-campaign.entity.js';

@Entity('sms_campaign_batches')
export class SmsCampaignBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ type: 'int', default: 0 })
  sequence: number;

  @Column({
    type: 'enum',
    enum: SmsBatchStatus,
    enumName: 'sms_batch_status_enum',
    default: SmsBatchStatus.PENDING,
  })
  status: SmsBatchStatus;

  @Column({ name: 'recipient_count', type: 'int', default: 0 })
  recipientCount: number;

  @Column({ name: 'client_reference', length: 100, unique: true })
  clientReference: string;

  @Column({ name: 'provider_package_id', length: 80, nullable: true })
  providerPackageId?: string;

  @Column({ name: 'job_id', length: 80, nullable: true })
  jobId?: string;

  @Column({ type: 'int', default: 0 })
  attempt: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string;

  @Column({ name: 'claimed_at', type: 'timestamptz', nullable: true })
  claimedAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => SmsCampaign, (campaign) => campaign.batches, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: SmsCampaign;
}
