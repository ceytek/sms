import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity.js';
import { KvkkTextDocument } from './kvkk-text-document.entity.js';
import type { KvkkFormCheckbox } from './kvkk-form-checkbox.entity.js';

@Entity('kvkk_forms')
export class KvkkForm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_company_id', type: 'uuid' })
  ownerCompanyId: string;

  @Column({ length: 160 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  subtitle?: string;

  @Column({ name: 'logo_url', length: 500, nullable: true })
  logoUrl?: string;

  @Column({ name: 'company_display_name', length: 255, nullable: true })
  companyDisplayName?: string;

  @Column({ name: 'contact_info', type: 'text', nullable: true })
  contactInfo?: string;

  @Column({ name: 'text_document_id', type: 'uuid', nullable: true })
  textDocumentId?: string;

  @Column({ type: 'jsonb', default: () => `'["firstName","lastName","phone","email"]'` })
  fields: string[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_company_id' })
  ownerCompany: Company;

  @ManyToOne(() => KvkkTextDocument, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'text_document_id' })
  textDocument?: KvkkTextDocument;

  @OneToMany('KvkkFormCheckbox', 'form', { cascade: true, eager: true })
  checkboxes: KvkkFormCheckbox[];
}
