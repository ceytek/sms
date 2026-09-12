import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { Company } from './company.entity.js';
import { CompanyOriginator } from './company-originator.entity.js';

@Entity('company_service_keywords')
export class CompanyServiceKeyword extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'originator_id', type: 'uuid', nullable: true })
  originatorId?: string;

  @Column({ length: 100 })
  title: string;

  @Column({ length: 50 })
  keyword: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => CompanyOriginator, { nullable: true })
  @JoinColumn({ name: 'originator_id' })
  originator?: CompanyOriginator;
}
