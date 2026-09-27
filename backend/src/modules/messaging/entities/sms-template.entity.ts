import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sms_templates')
export class SmsTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_company_id', type: 'uuid' })
  ownerCompanyId: string;

  @Column({ length: 120 })
  name: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
