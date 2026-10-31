import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type SurveyTemplateQuestion = {
  type: string;
  text: string;
  description?: string;
  required?: boolean;
  options?: string[];
};

@Entity('survey_templates')
export class SurveyTemplate {
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
  definition: { questions: SurveyTemplateQuestion[] };

  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
