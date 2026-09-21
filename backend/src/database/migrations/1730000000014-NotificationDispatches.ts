import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationDispatches1730000000014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "notification_purpose_enum" AS ENUM ('ACCOUNT_CREDENTIALS');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "notification_channel_enum" AS ENUM ('SMS', 'EMAIL');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "notification_dispatch_status_enum" AS ENUM ('MOCK_SENT', 'FAILED');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      CREATE TABLE "notification_dispatches" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "sender_company_id" uuid NOT NULL,
        "target_company_id" uuid NOT NULL,
        "purpose" "notification_purpose_enum" NOT NULL,
        "channel" "notification_channel_enum" NOT NULL,
        "recipient" character varying(255) NOT NULL,
        "status" "notification_dispatch_status_enum" NOT NULL DEFAULT 'MOCK_SENT',
        "provider_name" character varying(80) NOT NULL,
        "provider_message_id" character varying(120),
        "error_message" character varying(500),
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "FK_notification_dispatches_sender" FOREIGN KEY ("sender_company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notification_dispatches_target" FOREIGN KEY ("target_company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_notification_dispatches_sender" ON "notification_dispatches" ("sender_company_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notification_dispatches_target" ON "notification_dispatches" ("target_company_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_dispatches"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_dispatch_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_channel_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_purpose_enum"`);
  }
}
