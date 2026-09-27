import { MigrationInterface, QueryRunner } from 'typeorm';

export class SmsSendablePhoneIndex1730000000020 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_sms_recipients_sendable_phone"
        ON "sms_campaign_recipients" ("campaign_id", "mobile_normalized")
        WHERE "mobile_normalized" IS NOT NULL
          AND "status" IN ('INCLUDED', 'QUEUED', 'PROCESSING', 'ACCEPTED', 'SENT', 'DELIVERED')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_sms_recipients_sendable_phone"`);
  }
}
