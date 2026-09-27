import { MigrationInterface, QueryRunner } from 'typeorm';

export class CampaignNameCategory1730000000025 implements MigrationInterface {
  name = 'CampaignNameCategory1730000000025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sms_campaigns" ADD COLUMN IF NOT EXISTS "name" character varying(120)`);
    await queryRunner.query(`ALTER TABLE "sms_campaigns" ADD COLUMN IF NOT EXISTS "category" character varying(40)`);
    await queryRunner.query(
      `ALTER TABLE "sms_campaigns" ADD COLUMN IF NOT EXISTS "composition" character varying(20) NOT NULL DEFAULT 'BULK'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sms_campaigns" DROP COLUMN IF EXISTS "composition"`);
    await queryRunner.query(`ALTER TABLE "sms_campaigns" DROP COLUMN IF EXISTS "category"`);
    await queryRunner.query(`ALTER TABLE "sms_campaigns" DROP COLUMN IF EXISTS "name"`);
  }
}
