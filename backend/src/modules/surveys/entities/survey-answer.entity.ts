import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('survey_answers')
export class SurveyAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'response_id', type: 'uuid' })
  responseId: string;

  @Column({ name: 'question_id', type: 'uuid' })
  questionId: string;

  @Column({ name: 'option_id', type: 'uuid', nullable: true })
  optionId?: string;

  @Column({ name: 'value_text', type: 'text', nullable: true })
  valueText?: string;

  @Column({ name: 'value_number', type: 'numeric', nullable: true })
  valueNumber?: string;

  @Column({ name: 'value_json', type: 'jsonb', nullable: true })
  valueJson?: string[];
}
