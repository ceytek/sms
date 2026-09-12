import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { Company } from './company.entity.js';
import { SmsProvider } from '../../reference/entities/sms-provider.entity.js';
@Entity('company_sms_accounts')
export class CompanySmsAccount extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId: string;

  @Column({ length: 100, nullable: true })
  username?: string;

  @Column({ name: 'subscriber_no', length: 50, nullable: true })
  subscriberNo?: string;

  @Column({
    name: 'credit_refund_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  creditRefundRate?: number;

  @Column({ name: 'single_send_limit', type: 'int', nullable: true })
  singleSendLimit?: number;

  @Column({ name: 'apply_to_sub_accounts', default: false })
  applyToSubAccounts: boolean;

  @Column({ name: 'no_routing', default: false })
  noRouting: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => SmsProvider)
  @JoinColumn({ name: 'provider_id' })
  provider: SmsProvider;
}
