import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import type { DocumentTypeAssignment } from './document-type-assignment.entity.js';
import type { CompanyDocument } from './company-document.entity.js';

@Entity('document_types')
export class DocumentType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'is_required', default: true })
  isRequired: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'applies_to_all', default: false })
  appliesToAll: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany('DocumentTypeAssignment', 'documentType')
  assignments: DocumentTypeAssignment[];

  @OneToMany('CompanyDocument', 'documentType')
  companyDocuments: CompanyDocument[];
}
