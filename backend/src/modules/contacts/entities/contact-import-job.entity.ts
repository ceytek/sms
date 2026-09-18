import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity.js';
import { ContactImportType } from '../../../common/enums/contact-import-type.enum.js';
import { ContactImportStatus } from '../../../common/enums/contact-import-status.enum.js';
import { ContactDuplicatePolicy } from '../../../common/enums/contact-duplicate-policy.enum.js';
import type { ContactImportError } from './contact-import-error.entity.js';

@Entity('contact_import_jobs')
export class ContactImportJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_company_id', type: 'uuid' })
  ownerCompanyId: string;

  @Column({ name: 'file_name', length: 255, nullable: true })
  fileName?: string;

  @Column({
    name: 'import_type',
    type: 'enum',
    enum: ContactImportType,
    enumName: 'contact_import_type_enum',
  })
  importType: ContactImportType;

  @Column({
    type: 'enum',
    enum: ContactImportStatus,
    enumName: 'contact_import_status_enum',
    default: ContactImportStatus.PREVIEW,
  })
  status: ContactImportStatus;

  @Column({
    name: 'duplicate_policy',
    type: 'enum',
    enum: ContactDuplicatePolicy,
    enumName: 'contact_duplicate_policy_enum',
    default: ContactDuplicatePolicy.SKIP,
  })
  duplicatePolicy: ContactDuplicatePolicy;

  @Column({ type: 'jsonb', nullable: true })
  columns?: string[];

  @Column({ type: 'jsonb', nullable: true })
  mapping?: Record<string, string>;

  @Column({ name: 'raw_rows', type: 'jsonb', nullable: true })
  rawRows?: Record<string, string>[];

  @Column({ name: 'total_rows', type: 'int', default: 0 })
  totalRows: number;

  @Column({ name: 'valid_rows', type: 'int', default: 0 })
  validRows: number;

  @Column({ name: 'successful_rows', type: 'int', default: 0 })
  successfulRows: number;

  @Column({ name: 'failed_rows', type: 'int', default: 0 })
  failedRows: number;

  @Column({ name: 'duplicate_rows', type: 'int', default: 0 })
  duplicateRows: number;

  @Column({ name: 'existing_rows', type: 'int', default: 0 })
  existingRows: number;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_company_id' })
  ownerCompany: Company;

  @OneToMany('ContactImportError', 'job')
  errors: ContactImportError[];
}
