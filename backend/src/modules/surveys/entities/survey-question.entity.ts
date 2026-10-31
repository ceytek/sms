import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('survey_questions')
export class SurveyQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'survey_id', type: 'uuid' })
  surveyId: string;

  @Column({ length: 20 })
  type: string;

  @Column({ length: 500 })
  text: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: false })
  required: boolean;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ name: 'show_when', type: 'jsonb', nullable: true })
  showWhen?: { questionId?: string; optionId?: string; value?: string } | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
