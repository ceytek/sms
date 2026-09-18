import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ContactImportErrorType } from '../../../common/enums/contact-import-error-type.enum.js';
import { ContactImportJob } from './contact-import-job.entity.js';

@Entity('contact_import_errors')
export class ContactImportError {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'import_job_id', type: 'uuid' })
  importJobId: string;

  @Column({ name: 'row_number', type: 'int', nullable: true })
  rowNumber?: number;

  @Column({ name: 'raw_data', type: 'jsonb', nullable: true })
  rawData?: Record<string, string>;

  @Column({
    name: 'error_type',
    type: 'enum',
    enum: ContactImportErrorType,
    enumName: 'contact_import_error_type_enum',
  })
  errorType: ContactImportErrorType;

  @Column({ name: 'error_message', length: 500 })
  errorMessage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ContactImportJob, (job) => job.errors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'import_job_id' })
  job: ContactImportJob;
}
