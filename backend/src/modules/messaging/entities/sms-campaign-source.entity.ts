import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { SmsCampaignSourceType } from '../../../common/enums/sms-campaign-source-type.enum.js';
import { SmsCampaign } from './sms-campaign.entity.js';

@Entity('sms_campaign_sources')
export class SmsCampaignSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId: string;

  @Column({
    name: 'source_type',
    type: 'enum',
    enum: SmsCampaignSourceType,
    enumName: 'sms_campaign_source_type_enum',
  })
  sourceType: SmsCampaignSourceType;

  @Column({ length: 180 })
  label: string;

  @Column({ name: 'raw_count', type: 'int', default: 0 })
  rawCount: number;

  @Column({ name: 'group_id', type: 'uuid', nullable: true })
  groupId?: string;

  @Column({ name: 'tag_id', type: 'uuid', nullable: true })
  tagId?: string;

  @Column({ name: 'subcategory_id', type: 'uuid', nullable: true })
  subcategoryId?: string;

  @Column({ name: 'file_name', length: 255, nullable: true })
  fileName?: string;

  @Column({ type: 'jsonb', nullable: true })
  payload?: Record<string, unknown>;

  @ManyToOne(() => SmsCampaign, (campaign) => campaign.sources, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: SmsCampaign;
}
