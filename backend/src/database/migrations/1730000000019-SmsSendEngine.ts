import { MigrationInterface, QueryRunner } from 'typeorm';

const CAMPAIGN_STATUSES = [
  'SCHEDULED',
  'PREPARING',
  'READY',
  'PROCESSING',
  'COMPLETED',
  'PARTIALLY_COMPLETED',
  'CANCELLED',
];

const RECIPIENT_STATUSES = [
  'QUEUED',
  'PROCESSING',
  'ACCEPTED',
  'DELIVERED',
  'EXPIRED',
  'REJECTED',
];

const AUDIENCE_SOURCES = ['CONTACT_GROUP', 'MIXED'];

export class SmsSendEngine1730000000019 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const value of CAMPAIGN_STATUSES) {
      await queryRunner.query(
        `ALTER TYPE "sms_campaign_status_enum" ADD VALUE IF NOT EXISTS '${value}'`,
      );
    }
    for (const value of RECIPIENT_STATUSES) {
      await queryRunner.query(
        `ALTER TYPE "sms_recipient_status_enum" ADD VALUE IF NOT EXISTS '${value}'`,
      );
    }
    for (const value of AUDIENCE_SOURCES) {
      await queryRunner.query(
        `ALTER TYPE "sms_audience_source_enum" ADD VALUE IF NOT EXISTS '${value}'`,
      );
    }

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "sms_campaign_source_type_enum" AS ENUM (
          'CONTACT_GROUP', 'CONTACT_PICK', 'CONTACT_BOOK', 'MANUAL', 'FILE', 'CUSTOMER_CATEGORY', 'TAG'
        );
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "sms_batch_status_enum" AS ENUM (
          'PENDING', 'PROCESSING', 'ACCEPTED', 'FAILED', 'DEAD', 'CANCELLED'
        );
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    await queryRunner.query(`
      ALTER TABLE "sms_campaigns"
        ADD COLUMN IF NOT EXISTS "idempotency_key" varchar(80),
        ADD COLUMN IF NOT EXISTS "sms_account_id" uuid,
        ADD COLUMN IF NOT EXISTS "scheduled_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "prepared_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "kvkk_check_enabled" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "actual_units" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "reserved_units" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "reservation_tx_id" uuid,
        ADD COLUMN IF NOT EXISTS "queued_count" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "processing_count" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "accepted_count" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "delivered_count" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "blacklist_count" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "consent_excluded_count" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "passive_count" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "raw_recipient_count" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "last_error" text,
        ADD COLUMN IF NOT EXISTS "file_path" varchar(500),
        ADD COLUMN IF NOT EXISTS "originator_name" varchar(20)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_sms_campaigns_idempotency"
        ON "sms_campaigns" ("sender_company_id", "idempotency_key")
        WHERE "idempotency_key" IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "sms_campaign_recipients"
        ADD COLUMN IF NOT EXISTS "contact_id" uuid,
        ADD COLUMN IF NOT EXISTS "source_type" varchar(40),
        ADD COLUMN IF NOT EXISTS "display_name" varchar(160),
        ADD COLUMN IF NOT EXISTS "first_name" varchar(80),
        ADD COLUMN IF NOT EXISTS "last_name" varchar(80),
        ADD COLUMN IF NOT EXISTS "company_name" varchar(255),
        ADD COLUMN IF NOT EXISTS "rendered_body" text,
        ADD COLUMN IF NOT EXISTS "encoding" varchar(20),
        ADD COLUMN IF NOT EXISTS "sms_parts" integer NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS "client_reference" varchar(80),
        ADD COLUMN IF NOT EXISTS "batch_id" uuid,
        ADD COLUMN IF NOT EXISTS "claimed_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "accepted_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "delivered_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "last_error" varchar(250),
        ADD COLUMN IF NOT EXISTS "send_attempt" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_sms_recipients_client_reference"
        ON "sms_campaign_recipients" ("client_reference")
        WHERE "client_reference" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sms_recipients_campaign_status"
        ON "sms_campaign_recipients" ("campaign_id", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sms_campaign_sources" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "campaign_id" uuid NOT NULL,
        "source_type" "sms_campaign_source_type_enum" NOT NULL,
        "label" varchar(180) NOT NULL,
        "raw_count" integer NOT NULL DEFAULT 0,
        "group_id" uuid,
        "tag_id" uuid,
        "subcategory_id" uuid,
        "file_name" varchar(255),
        "payload" jsonb,
        CONSTRAINT "FK_sms_campaign_sources_campaign"
          FOREIGN KEY ("campaign_id") REFERENCES "sms_campaigns"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sms_campaign_batches" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "campaign_id" uuid NOT NULL,
        "company_id" uuid NOT NULL,
        "sequence" integer NOT NULL DEFAULT 0,
        "status" "sms_batch_status_enum" NOT NULL DEFAULT 'PENDING',
        "recipient_count" integer NOT NULL DEFAULT 0,
        "client_reference" varchar(80) NOT NULL,
        "job_id" varchar(80),
        "attempt" integer NOT NULL DEFAULT 0,
        "last_error" text,
        "claimed_at" TIMESTAMPTZ,
        "completed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_sms_campaign_batches_reference" UNIQUE ("client_reference"),
        CONSTRAINT "FK_sms_campaign_batches_campaign"
          FOREIGN KEY ("campaign_id") REFERENCES "sms_campaigns"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sms_campaign_batches_campaign"
        ON "sms_campaign_batches" ("campaign_id", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sms_templates" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "owner_company_id" uuid NOT NULL,
        "name" varchar(120) NOT NULL,
        "body" text NOT NULL,
        "created_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_sms_templates_company"
          FOREIGN KEY ("owner_company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "sms_providers"
        ADD COLUMN IF NOT EXISTS "rate_limits" jsonb
    `);
    await queryRunner.query(`
      UPDATE "sms_providers"
      SET "rate_limits" = '{"requestPerSecond": 10, "messagePerSecond": 50, "maxBatchSize": 100, "batchesPerSecond": 5}'::jsonb
      WHERE "rate_limits" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "sms_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sms_campaign_batches"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sms_campaign_sources"`);
  }
}
