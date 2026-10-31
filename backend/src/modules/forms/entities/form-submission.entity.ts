import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('form_submissions')
export class FormSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'form_id', type: 'uuid' })
  formId: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'recipient_id', type: 'uuid', nullable: true })
  recipientId?: string;

  @Column({ name: 'session_key', length: 80, nullable: true })
  sessionKey?: string;

  @Column({ length: 20, default: 'PUBLIC' })
  channel: string;

  @Column({ length: 20, default: 'NEW' })
  status: string;

  @Column({ type: 'jsonb', default: {} })
  data: Record<string, unknown>;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ length: 20, nullable: true })
  source?: string;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
