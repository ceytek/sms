import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity.js';
import { KvkkForm } from './kvkk-form.entity.js';
import { KvkkTextVersion } from './kvkk-text-version.entity.js';
import { KvkkQrCode } from './kvkk-qr-code.entity.js';
import { KvkkConsentStatus } from '../../../common/enums/kvkk-consent-status.enum.js';
import { KvkkConsentMethod } from '../../../common/enums/kvkk-consent-method.enum.js';

@Entity('kvkk_consents')
export class KvkkConsent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_company_id', type: 'uuid' })
  ownerCompanyId: string;

  @Column({ name: 'first_name', length: 80, nullable: true })
  firstName?: string;

  @Column({ name: 'last_name', length: 80, nullable: true })
  lastName?: string;

  @Column({ name: 'mobile_phone', length: 40 })
  mobilePhone: string;

  @Column({ name: 'normalized_phone', length: 20 })
  normalizedPhone: string;

  @Column({ length: 255, nullable: true })
  email?: string;

  @Column({
    type: 'enum',
    enum: KvkkConsentStatus,
    enumName: 'kvkk_consent_status_enum',
    default: KvkkConsentStatus.PENDING,
  })
  status: KvkkConsentStatus;

  @Column({
    type: 'enum',
    enum: KvkkConsentMethod,
    enumName: 'kvkk_consent_method_enum',
  })
  method: KvkkConsentMethod;

  @Column({ name: 'form_id', type: 'uuid', nullable: true })
  formId?: string;

  @Column({ name: 'form_name_snapshot', length: 160, nullable: true })
  formNameSnapshot?: string;

  @Column({ name: 'text_version_id', type: 'uuid', nullable: true })
  textVersionId?: string;

  @Column({ name: 'text_version_number', type: 'int', nullable: true })
  textVersionNumber?: number;

  @Column({ name: 'text_title_snapshot', length: 255, nullable: true })
  textTitleSnapshot?: string;

  @Column({ name: 'text_body_snapshot', type: 'text', nullable: true })
  textBodySnapshot?: string;

  @Column({ name: 'checkbox_answers', type: 'jsonb', nullable: true })
  checkboxAnswers?: { id: string; label: string; required: boolean; checked: boolean }[];

  @Column({ name: 'form_payload', type: 'jsonb', nullable: true })
  formPayload?: Record<string, string>;

  @Column({ name: 'qr_id', type: 'uuid', nullable: true })
  qrId?: string;

  @Column({ name: 'otp_challenge_id', type: 'uuid', nullable: true })
  otpChallengeId?: string;

  @Column({ name: 'form_link_id', type: 'uuid', nullable: true })
  formLinkId?: string;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt?: Date;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'cancelled_by', type: 'uuid', nullable: true })
  cancelledBy?: string;

  @Column({ name: 'cancel_source', length: 80, nullable: true })
  cancelSource?: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_company_id' })
  ownerCompany: Company;

  @ManyToOne(() => KvkkForm, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'form_id' })
  form?: KvkkForm;

  @ManyToOne(() => KvkkTextVersion, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'text_version_id' })
  textVersion?: KvkkTextVersion;

  @ManyToOne(() => KvkkQrCode, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'qr_id' })
  qr?: KvkkQrCode;
}
