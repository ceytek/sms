import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameKocaeliToVoiceTelekom1730000000026 implements MigrationInterface {
  name = 'RenameKocaeliToVoiceTelekom1730000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "sms_providers" AS target
      SET "config_schema" = jsonb_set(
        COALESCE(target."config_schema", '{}'::jsonb),
        '{api}',
        COALESCE(source."config_schema"->'api', '{}'::jsonb) || COALESCE(target."config_schema"->'api', '{}'::jsonb)
      )
      FROM "sms_providers" AS source
      WHERE target."code" = 'VOICE_TELEKOM'
        AND source."code" = 'KOCAELI'
    `);
    await queryRunner.query(`
      DELETE FROM "sms_providers" AS provider
      WHERE provider."code" = 'KOCAELI'
        AND NOT EXISTS (
          SELECT 1 FROM "company_sms_accounts" AS account WHERE account."provider_id" = provider."id"
        )
    `);
    await queryRunner.query(`
      UPDATE "sms_providers"
      SET "code" = 'VOICE_TELEKOM', "name" = 'VoiceTelekom'
      WHERE "code" = 'KOCAELI'
        AND NOT EXISTS (SELECT 1 FROM "sms_providers" WHERE "code" = 'VOICE_TELEKOM')
    `);
    await queryRunner.query(`
      UPDATE "sms_providers"
      SET "name" = 'VoiceTelekom'
      WHERE "name" = 'Kocaeli SMS'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "sms_providers"
      SET "code" = 'KOCAELI', "name" = 'Kocaeli SMS'
      WHERE "id" = 'a0000001-0000-4000-8000-000000000001'
        AND NOT EXISTS (
          SELECT 1 FROM "sms_providers" WHERE "code" = 'KOCAELI' AND "id" <> 'a0000001-0000-4000-8000-000000000001'
        )
    `);
  }
}
