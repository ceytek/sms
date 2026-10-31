import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('survey_settings')
export class SurveySetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid', unique: true })
  companyId: string;

  @Column({ name: 'default_thank_you', type: 'text', nullable: true })
  defaultThankYou?: string;

  @Column({ name: 'default_sms_body', type: 'text', nullable: true })
  defaultSmsBody?: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
