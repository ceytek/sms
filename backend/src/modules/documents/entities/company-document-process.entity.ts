import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DocumentProcessStatus } from '../../../common/enums/document-process-status.enum.js';
import { Company } from '../../companies/entities/company.entity.js';

@Entity('company_document_process')
export class CompanyDocumentProcess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({
    type: 'enum',
    enum: DocumentProcessStatus,
    enumName: 'document_process_status_enum',
    default: DocumentProcessStatus.IN_PROGRESS,
  })
  status: DocumentProcessStatus;

  @Column({ name: 'completed_by', type: 'uuid', nullable: true })
  completedBy?: string;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
