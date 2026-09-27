import { MigrationInterface, QueryRunner } from 'typeorm';

export class KocaeliProviderApiConfig1730000000022 implements MigrationInterface {
  name = 'KocaeliProviderApiConfig1730000000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "sms_providers"
      SET "config_schema" = COALESCE("config_schema", '{}'::jsonb) || '{"api":{"sendPath":"/sms/create","auth":"basic"}}'::jsonb
      WHERE "code" = 'KOCAELI'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "sms_providers"
      SET "config_schema" = "config_schema" - 'api'
      WHERE "code" = 'KOCAELI'
    `);
  }
}
