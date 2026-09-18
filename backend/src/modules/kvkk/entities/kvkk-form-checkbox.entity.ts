import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { KvkkForm } from './kvkk-form.entity.js';

@Entity('kvkk_form_checkboxes')
export class KvkkFormCheckbox {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'form_id', type: 'uuid' })
  formId: string;

  @Column({ length: 500 })
  label: string;

  @Column({ name: 'is_required', default: true })
  isRequired: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @ManyToOne('KvkkForm', 'checkboxes', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_id' })
  form: KvkkForm;
}
