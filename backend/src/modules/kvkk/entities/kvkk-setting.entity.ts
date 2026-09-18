import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity.js';

@Entity('kvkk_settings')
export class KvkkSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_company_id', type: 'uuid', unique: true })
  ownerCompanyId: string;

  @Column({ name: 'sms_consent_check_enabled', default: false })
  smsConsentCheckEnabled: boolean;

  @Column({ name: 'company_display_name', length: 255, nullable: true })
  companyDisplayName?: string;

  @Column({ name: 'logo_url', length: 500, nullable: true })
  logoUrl?: string;

  @Column({ name: 'contact_info', type: 'text', nullable: true })
  contactInfo?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_company_id' })
  ownerCompany: Company;
}
