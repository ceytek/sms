import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity.js';
import { ContactSource } from '../../../common/enums/contact-source.enum.js';
import { ContactStatus } from '../../../common/enums/contact-status.enum.js';
import type { ContactGroupMember } from './contact-group-member.entity.js';
import type { ContactTagMember } from './contact-tag-member.entity.js';

@Entity('contacts')
export class Contact {
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

  @Column({ name: 'company_name', length: 255, nullable: true })
  companyName?: string;

  @Column({ name: 'source_company_id', type: 'uuid', nullable: true })
  sourceCompanyId?: string;

  @Column({
    type: 'enum',
    enum: ContactSource,
    enumName: 'contact_source_enum',
    default: ContactSource.MANUAL,
  })
  source: ContactSource;

  @Column({
    type: 'enum',
    enum: ContactStatus,
    enumName: 'contact_status_enum',
    default: ContactStatus.ACTIVE,
  })
  status: ContactStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'custom_fields', type: 'jsonb', nullable: true })
  customFields?: Record<string, string>;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_company_id' })
  ownerCompany: Company;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'source_company_id' })
  sourceCompany?: Company;

  @OneToMany('ContactGroupMember', 'contact')
  groupMembers: ContactGroupMember[];

  @OneToMany('ContactTagMember', 'contact')
  tagMembers: ContactTagMember[];
}
