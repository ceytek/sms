import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('form_files')
export class FormFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'submission_id', type: 'uuid' })
  submissionId: string;

  @Column({ name: 'field_id', type: 'uuid' })
  fieldId: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'file_name', length: 500 })
  fileName: string;

  @Column({ name: 'file_path', length: 1000 })
  filePath: string;

  @Column({ name: 'file_size', type: 'int', default: 0 })
  fileSize: number;

  @Column({ name: 'mime_type', length: 100, nullable: true })
  mimeType?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
