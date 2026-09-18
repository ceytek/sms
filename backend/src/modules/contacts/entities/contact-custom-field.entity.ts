import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity.js';
import { ContactCustomFieldType } from '../../../common/enums/contact-custom-field-type.enum.js';

@Entity('contact_custom_fields')
export class ContactCustomField {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_company_id', type: 'uuid' })
  ownerCompanyId: string;

  @Column({ length: 80 })
  name: string;

  @Column({
    name: 'field_type',
    type: 'enum',
    enum: ContactCustomFieldType,
    enumName: 'contact_custom_field_type_enum',
    default: ContactCustomFieldType.TEXT,
  })
  fieldType: ContactCustomFieldType;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

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
}
