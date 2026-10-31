import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('survey_recipients')
export class SurveyRecipient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'survey_id', type: 'uuid' })
  surveyId: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId?: string;

  @Column({ name: 'normalized_phone', length: 20 })
  normalizedPhone: string;

  @Column({ name: 'display_name', length: 160, nullable: true })
  displayName?: string;

  @Column({ length: 64 })
  token: string;

  @Column({ name: 'invite_status', length: 20, default: 'NOT_SENT' })
  inviteStatus: string;

  @Column({ name: 'sms_campaign_id', type: 'uuid', nullable: true })
  smsCampaignId?: string;

  @Column({ name: 'sms_recipient_id', type: 'uuid', nullable: true })
  smsRecipientId?: string;

  @Column({ name: 'opened_at', type: 'timestamptz', nullable: true })
  openedAt?: Date;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
