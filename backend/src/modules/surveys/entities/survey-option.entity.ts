import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('survey_options')
export class SurveyOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'question_id', type: 'uuid' })
  questionId: string;

  @Column({ length: 200 })
  label: string;

  @Column({ type: 'int', default: 0 })
  position: number;
}
