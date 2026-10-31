import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('surveys')
export class Survey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ length: 160 })
  name: string;

  @Column({ name: 'form_title', length: 200, default: '' })
  formTitle: string;

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
  anonymous: boolean;

  @Column({ default: true })
  personalized: boolean;

  @Column({ name: 'single_response', default: true })
  singleResponse: boolean;

  @Column({ name: 'allow_edit', default: false })
  allowEdit: boolean;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt?: Date;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt?: Date;

  @Column({ name: 'public_slug', length: 80, nullable: true })
  publicSlug?: string;

  @Column({ name: 'sms_body', type: 'text', nullable: true })
  smsBody?: string;

  @Column({ name: 'originator_id', type: 'uuid', nullable: true })
  originatorId?: string;

  @Column({ type: 'jsonb', nullable: true })
  audience?: Record<string, unknown>;

  @Column({ name: 'public_open_count', type: 'int', default: 0 })
  publicOpenCount: number;

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
