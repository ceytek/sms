import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DocumentType } from './document-type.entity.js';
import { CustomerCategory } from '../../reference/entities/customer-category.entity.js';

@Entity('document_type_customer_types')
export class DocumentTypeAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_type_id', type: 'uuid' })
  documentTypeId: string;

  @Column({ name: 'customer_category_id', type: 'uuid' })
  customerCategoryId: string;

  @Column({ name: 'is_required', default: true })
  isRequired: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => DocumentType, (type) => type.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_type_id' })
  documentType: DocumentType;

  @ManyToOne(() => CustomerCategory, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_category_id' })
  category: CustomerCategory;
}
