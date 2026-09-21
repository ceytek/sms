import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { OriginatorRestrictionType } from '../../../common/enums/originator-restriction-type.enum.js';
import { Company } from '../../companies/entities/company.entity.js';
import { CompanyOriginator } from '../../companies/entities/company-originator.entity.js';

@Entity('originator_blocked_numbers')
export class OriginatorBlockedNumber extends BaseEntity {
  @Index()
  @Column({ name: 'owner_company_id', type: 'uuid' })
  ownerCompanyId: string;

  @Index()
  @Column({ name: 'originator_id', type: 'uuid' })
  originatorId: string;

  @Column({
    name: 'restriction_type',
    type: 'enum',
    enum: OriginatorRestrictionType,
    enumName: 'originator_restriction_type_enum',
  })
  restrictionType: OriginatorRestrictionType;

  @Column({ name: 'mobile_phone', length: 40 })
  mobilePhone: string;

  @Column({ name: 'normalized_phone', length: 20 })
  normalizedPhone: string;

  @Column({ name: 'first_name', length: 80, nullable: true })
  firstName?: string;

  @Column({ name: 'last_name', length: 80, nullable: true })
  lastName?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_company_id' })
  ownerCompany: Company;

  @ManyToOne(() => CompanyOriginator, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'originator_id' })
  originator: CompanyOriginator;
}
