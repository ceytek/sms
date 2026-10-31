import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('form_fields')
export class FormField {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'form_id', type: 'uuid' })
  formId: string;

  @Column({ length: 30 })
  type: string;

  @Column({ length: 300 })
  label: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 300, nullable: true })
  placeholder?: string;

  @Column({ default: false })
  required: boolean;

  @Column({ name: 'default_value', type: 'text', nullable: true })
  defaultValue?: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ type: 'jsonb', nullable: true })
  validation?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  options?: { label: string; position: number }[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
