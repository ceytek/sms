import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('survey_responses')
export class SurveyResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'survey_id', type: 'uuid' })
  surveyId: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'recipient_id', type: 'uuid', nullable: true })
  recipientId?: string;

  @Column({ name: 'session_key', length: 80, nullable: true })
  sessionKey?: string;

  @Column({ length: 20, default: 'PUBLIC' })
  channel: string;

  @Column({ length: 20, default: 'PARTIAL' })
  status: string;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @Column({ name: 'duration_seconds', type: 'int', nullable: true })
  durationSeconds?: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
