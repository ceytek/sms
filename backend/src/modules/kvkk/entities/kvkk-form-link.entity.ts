import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity.js';
import { KvkkForm } from './kvkk-form.entity.js';
import { KvkkFormLinkStatus } from '../../../common/enums/kvkk-form-link-status.enum.js';

@Entity('kvkk_form_links')
export class KvkkFormLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_company_id', type: 'uuid' })
  ownerCompanyId: string;

  @Column({ name: 'form_id', type: 'uuid' })
  formId: string;

  @Column({ name: 'consent_id', type: 'uuid', nullable: true })
  consentId?: string;

  @Column({ length: 80, unique: true })
  token: string;

  @Column({ name: 'mobile_phone', length: 40 })
  mobilePhone: string;

  @Column({ name: 'normalized_phone', length: 20 })
  normalizedPhone: string;

  @Column({ name: 'first_name', length: 80, nullable: true })
  firstName?: string;

  @Column({ name: 'last_name', length: 80, nullable: true })
  lastName?: string;

  @Column({
    type: 'enum',
    enum: KvkkFormLinkStatus,
    enumName: 'kvkk_form_link_status_enum',
    default: KvkkFormLinkStatus.PENDING,
  })
  status: KvkkFormLinkStatus;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_company_id' })
  ownerCompany: Company;

  @ManyToOne(() => KvkkForm, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_id' })
  form: KvkkForm;
}
