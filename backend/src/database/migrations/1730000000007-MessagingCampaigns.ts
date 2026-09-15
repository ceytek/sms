import { MigrationInterface, QueryRunner } from 'typeorm';

export class MessagingCampaigns1730000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "sms_send_type_enum" AS ENUM (
        'DEALER_TO_CUSTOMERS',
        'CUSTOMER_TO_RECIPIENTS'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "sms_audience_source_enum" AS ENUM (
        'CUSTOMER_CATEGORY',
        'MANUAL_NUMBERS',
        'FILE_IMPORT',
        'CONTACT_BOOK'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "sms_campaign_status_enum" AS ENUM (
        'DRAFT',
        'MOCK_SENT',
        'QUEUED',
        'SENDING',
        'SENT',
        'FAILED'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "sms_recipient_status_enum" AS ENUM (
        'INCLUDED',
        'EXCLUDED',
        'INVALID',
        'DUPLICATE',
        'SENT',
        'FAILED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sms_campaigns" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "sender_company_id" uuid NOT NULL,
        "created_by" uuid,
        "send_type" "sms_send_type_enum" NOT NULL,
        "audience_source" "sms_audience_source_enum" NOT NULL,
        "status" "sms_campaign_status_enum" NOT NULL DEFAULT 'DRAFT',
        "body" text NOT NULL,
        "encoding" character varying(20) NOT NULL DEFAULT 'GSM7',
        "sms_parts" integer NOT NULL DEFAULT 1,
        "estimated_units" integer NOT NULL DEFAULT 0,
        "originator_id" uuid,
        "provider_id" uuid,
        "is_mock" boolean NOT NULL DEFAULT true,
        "company_count" integer NOT NULL DEFAULT 0,
        "valid_recipient_count" integer NOT NULL DEFAULT 0,
        "invalid_count" integer NOT NULL DEFAULT 0,
        "duplicate_count" integer NOT NULL DEFAULT 0,
        "excluded_count" integer NOT NULL DEFAULT 0,
        "success_count" integer NOT NULL DEFAULT 0,
        "fail_count" integer NOT NULL DEFAULT 0,
        "sent_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "FK_sms_campaigns_sender_company"
          FOREIGN KEY ("sender_company_id") REFERENCES "companies"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sms_campaign_segments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "campaign_id" uuid NOT NULL,
        "subcategory_id" uuid NOT NULL,
        "subcategory_name" character varying(150) NOT NULL,
        "category_name" character varying(150) NOT NULL,
        "company_count" integer NOT NULL DEFAULT 0,
        CONSTRAINT "FK_sms_campaign_segments_campaign"
          FOREIGN KEY ("campaign_id") REFERENCES "sms_campaigns"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sms_campaign_segments_subcategory"
          FOREIGN KEY ("subcategory_id") REFERENCES "customer_subcategories"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sms_campaign_recipients" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "campaign_id" uuid NOT NULL,
        "company_id" uuid,
        "subcategory_id" uuid,
        "mobile_raw" character varying(40),
        "mobile_normalized" character varying(20),
        "status" "sms_recipient_status_enum" NOT NULL,
        "exclude_reason" character varying(80),
        "consent_status" character varying(30),
        "provider_message_id" character varying(120),
        CONSTRAINT "FK_sms_campaign_recipients_campaign"
          FOREIGN KEY ("campaign_id") REFERENCES "sms_campaigns"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sms_campaign_recipients_company"
          FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sms_campaigns_sender_created"
      ON "sms_campaigns" ("sender_company_id", "created_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_sms_campaign_recipients_campaign_status"
      ON "sms_campaign_recipients" ("campaign_id", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "sms_campaign_recipients"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sms_campaign_segments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sms_campaigns"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "sms_recipient_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "sms_campaign_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "sms_audience_source_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "sms_send_type_enum"`);
  }
}
