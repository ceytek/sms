import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProviderContractFields1730000000023 implements MigrationInterface {
  name = 'ProviderContractFields1730000000023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sms_campaign_batches"
        ALTER COLUMN "client_reference" TYPE varchar(100)
    `);
    await queryRunner.query(`
      ALTER TABLE "sms_campaign_batches"
        ADD COLUMN IF NOT EXISTS "provider_package_id" varchar(80)
    `);
    await queryRunner.query(`
      ALTER TABLE "sms_campaign_recipients"
        ADD COLUMN IF NOT EXISTS "provider_state" varchar(40)
    `);
    await queryRunner.query(`
      UPDATE "sms_providers"
      SET "config_schema" = COALESCE("config_schema", '{}'::jsonb) || '{"api":{"sendPath":"/sms/create","summaryPath":"/sms/summary","auth":"basic"}}'::jsonb
      WHERE "code" = 'KOCAELI'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sms_campaign_recipients" DROP COLUMN IF EXISTS "provider_state"`);
    await queryRunner.query(`ALTER TABLE "sms_campaign_batches" DROP COLUMN IF EXISTS "provider_package_id"`);
  }
}
