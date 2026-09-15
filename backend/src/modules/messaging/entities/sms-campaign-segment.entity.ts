import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { SmsCampaign } from './sms-campaign.entity.js';
import { CustomerSubcategory } from '../../reference/entities/customer-subcategory.entity.js';

@Entity('sms_campaign_segments')
export class SmsCampaignSegment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId: string;

  @Column({ name: 'subcategory_id', type: 'uuid' })
  subcategoryId: string;

  @Column({ name: 'subcategory_name', length: 150 })
  subcategoryName: string;

  @Column({ name: 'category_name', length: 150 })
  categoryName: string;

  @Column({ name: 'company_count', type: 'int', default: 0 })
  companyCount: number;

  @ManyToOne(() => SmsCampaign, (campaign) => campaign.segments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: SmsCampaign;

  @ManyToOne(() => CustomerSubcategory, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subcategory_id' })
  subcategory: CustomerSubcategory;
}
