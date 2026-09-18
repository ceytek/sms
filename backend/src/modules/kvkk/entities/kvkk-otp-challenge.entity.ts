import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity.js';
import { KvkkOtpStatus } from '../../../common/enums/kvkk-otp-status.enum.js';

@Entity('kvkk_otp_challenges')
export class KvkkOtpChallenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_company_id', type: 'uuid' })
  ownerCompanyId: string;

  @Column({ name: 'consent_id', type: 'uuid', nullable: true })
  consentId?: string;

  @Column({ name: 'mobile_phone', length: 40 })
  mobilePhone: string;

  @Column({ name: 'normalized_phone', length: 20 })
  normalizedPhone: string;

  @Column({ name: 'code_hash', length: 64 })
  codeHash: string;

  @Column({ name: 'provider_ref', length: 120, nullable: true })
  providerRef?: string;

  @Column({
    type: 'enum',
    enum: KvkkOtpStatus,
    enumName: 'kvkk_otp_status_enum',
    default: KvkkOtpStatus.SENT,
  })
  status: KvkkOtpStatus;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt?: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_company_id' })
  ownerCompany: Company;
}
