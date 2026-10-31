import { MigrationInterface, QueryRunner } from 'typeorm';

export class SurveyResponseSingleOpen1730000000029 implements MigrationInterface {
  name = 'SurveyResponseSingleOpen1730000000029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM survey_responses r
      WHERE r.status = 'PARTIAL'
        AND r.recipient_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM survey_answers a WHERE a.response_id = r.id)
        AND EXISTS (
          SELECT 1 FROM survey_responses other
          WHERE other.survey_id = r.survey_id
            AND other.recipient_id = r.recipient_id
            AND other.id <> r.id
            AND (
              other.status = 'COMPLETED'
              OR other.created_at > r.created_at
              OR (other.created_at = r.created_at AND other.id > r.id)
            )
        )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_survey_responses_recipient_open"
      ON "survey_responses" ("survey_id", "recipient_id")
      WHERE "recipient_id" IS NOT NULL AND "status" = 'PARTIAL'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_survey_responses_recipient_open"`);
  }
}
