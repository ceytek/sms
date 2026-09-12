import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { OriginatorStatus } from '../../../common/enums/originator-status.enum.js';
import { Company } from './company.entity.js';
import { CompanySmsAccount } from './company-sms-account.entity.js';

@Entity('company_originators')
export class CompanyOriginator extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'sms_account_id', type: 'uuid', nullable: true })
  smsAccountId?: string;

  @Column({ length: 11 })
  name: string;

  @Column({
    type: 'enum',
    enum: OriginatorStatus,
    default: OriginatorStatus.PENDING,
  })
  status: OriginatorStatus;

  @Column({ name: 'provider_reference', length: 100, nullable: true })
  providerReference?: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => CompanySmsAccount, { nullable: true })
  @JoinColumn({ name: 'sms_account_id' })
  smsAccount?: CompanySmsAccount;
}
