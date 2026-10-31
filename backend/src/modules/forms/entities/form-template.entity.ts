import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type FormTemplateField = {
  type: string;
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  validation?: Record<string, unknown>;
  options?: { label: string; position: number }[];
};

@Entity('form_templates')
export class FormTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId?: string;

  @Column({ length: 160 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 80, nullable: true })
  category?: string;

  @Column({ type: 'jsonb' })
  definition: { fields: FormTemplateField[] };

  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
