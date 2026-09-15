import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DocumentStatus } from '../../../common/enums/document-status.enum.js';
import { Company } from '../../companies/entities/company.entity.js';
import { DocumentType } from './document-type.entity.js';

@Entity('company_documents')
export class CompanyDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'document_type_id', type: 'uuid', nullable: true })
  documentTypeId?: string;

  @Column({ name: 'custom_document_name', length: 150, nullable: true })
  customDocumentName?: string;

  @Column({
    name: 'document_status',
    type: 'enum',
    enum: DocumentStatus,
    enumName: 'document_status_enum',
    default: DocumentStatus.PENDING,
  })
  documentStatus: DocumentStatus;

  @Column({ name: 'file_name', length: 255, nullable: true })
  fileName?: string;

  @Column({ name: 'file_path', length: 500, nullable: true })
  filePath?: string;

  @Column({ name: 'missing_description', type: 'text', nullable: true })
  missingDescription?: string;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedBy?: string;

  @Column({ name: 'uploaded_at', type: 'timestamptz', nullable: true })
  uploadedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => DocumentType, (type) => type.companyDocuments, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'document_type_id' })
  documentType?: DocumentType;
}
