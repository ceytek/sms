import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { ContactType } from '../../../common/enums/contact-type.enum.js';
import { Company } from './company.entity.js';

@Entity('company_contacts')
export class CompanyContact extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ length: 200 })
  name: string;

  @Column({
    name: 'contact_type',
    type: 'enum',
    enum: ContactType,
  })
  contactType: ContactType;

  @Column({ length: 20, nullable: true })
  mobile?: string;

  @Column({ length: 20, nullable: true })
  phone?: string;

  @Column({ length: 255, nullable: true })
  email?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
