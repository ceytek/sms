import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameKocaeliToVoiceTelekom1730000000026 implements MigrationInterface {
  name = 'RenameKocaeliToVoiceTelekom1730000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "sms_providers" p
      WHERE p."code" = 'VOICE_TELEKOM'
        AND NOT EXISTS (
          SELECT 1 FROM "company_sms_accounts" a WHERE a."provider_id" = p."id"
        )
    `);
    await queryRunner.query(`
      UPDATE "sms_providers"
      SET "code" = 'VOICE_TELEKOM', "name" = 'VoiceTelekom'
      WHERE "code" = 'KOCAELI'
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
    `);
  }
}
