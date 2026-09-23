import { MigrationInterface, QueryRunner } from 'typeorm';

export class ServiceTermExpiryReminder1730000000018 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "company_service_terms"
        ADD COLUMN IF NOT EXISTS "expiry_reminder_sent_at" TIMESTAMPTZ
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "company_service_terms"
        DROP COLUMN IF EXISTS "expiry_reminder_sent_at"
    `);
  }
}
