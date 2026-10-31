import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('form_recipients')
export class FormRecipient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'form_id', type: 'uuid' })
  formId: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ length: 200, nullable: true })
  name?: string;

  @Column({ length: 30, nullable: true })
  phone?: string;

  @Column({ name: 'normalized_phone', length: 20, nullable: true })
  normalizedPhone?: string;

  @Column({ length: 200, nullable: true })
  email?: string;

  @Column({ length: 40 })
  token: string;

  @Column({ name: 'invite_status', length: 20, default: 'PENDING' })
  inviteStatus: string;

  @Column({ name: 'opened_at', type: 'timestamptz', nullable: true })
  openedAt?: Date;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @Column({ name: 'sms_recipient_id', type: 'uuid', nullable: true })
  smsRecipientId?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
