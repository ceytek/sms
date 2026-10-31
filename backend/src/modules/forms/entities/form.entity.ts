import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('forms')
export class Form {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ length: 160 })
  name: string;

  @Column({ length: 200, default: '' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'logo_url', length: 500, nullable: true })
  logoUrl?: string;

  @Column({ name: 'company_name_override', length: 255, nullable: true })
  companyNameOverride?: string;

  @Column({ name: 'thank_you_message', type: 'text', nullable: true })
  thankYouMessage?: string;

  @Column({ length: 20, default: 'DRAFT' })
  status: string;

  @Column({ default: false })
  personalized: boolean;

  @Column({ name: 'single_submission', default: false })
  singleSubmission: boolean;

  @Column({ name: 'allow_edit', default: false })
  allowEdit: boolean;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt?: Date;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt?: Date;

  @Column({ name: 'max_submissions', type: 'int', nullable: true })
  maxSubmissions?: number;

  @Column({ name: 'public_slug', length: 80, nullable: true })
  publicSlug?: string;

  @Column({ name: 'sms_body', type: 'text', nullable: true })
  smsBody?: string;

  @Column({ name: 'originator_id', type: 'uuid', nullable: true })
  originatorId?: string;

  @Column({ type: 'jsonb', nullable: true })
  audience?: Record<string, unknown>;

  @Column({ name: 'submission_count', type: 'int', default: 0 })
  submissionCount: number;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt?: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
