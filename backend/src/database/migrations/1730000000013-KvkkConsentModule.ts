import { MigrationInterface, QueryRunner } from 'typeorm';

export class KvkkConsentModule1730000000013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "services" ("id", "code", "name", "description", "is_active")
      VALUES (
        'b0000001-0000-4000-8000-000000000007',
        'KVKK',
        'KVKK / İzin Yönetimi',
        'İletişim izni toplama ve yönetim hizmeti',
        true
      )
      ON CONFLICT ("code") DO NOTHING
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "kvkk_consent_status_enum" AS ENUM ('APPROVED', 'PENDING', 'REJECTED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "kvkk_consent_method_enum" AS ENUM ('SHORT_CODE', 'SMS_FORM', 'QR');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "kvkk_otp_status_enum" AS ENUM ('SENT', 'VERIFIED', 'EXPIRED', 'FAILED');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "kvkk_form_link_status_enum" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    await queryRunner.query(`
      CREATE TABLE "kvkk_settings" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "owner_company_id" uuid NOT NULL UNIQUE,
        "sms_consent_check_enabled" boolean NOT NULL DEFAULT false,
        "company_display_name" character varying(255),
        "logo_url" character varying(500),
        "contact_info" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_kvkk_settings_owner" FOREIGN KEY ("owner_company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "kvkk_text_documents" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "owner_company_id" uuid NOT NULL,
        "name" character varying(160) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_kvkk_text_documents_owner" FOREIGN KEY ("owner_company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "kvkk_text_versions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "document_id" uuid NOT NULL,
        "version" integer NOT NULL,
        "title" character varying(255) NOT NULL,
        "body_html" text NOT NULL,
        "is_current" boolean NOT NULL DEFAULT true,
        "created_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_kvkk_text_versions_document" FOREIGN KEY ("document_id") REFERENCES "kvkk_text_documents"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_kvkk_text_versions_doc_ver" UNIQUE ("document_id", "version")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "kvkk_forms" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "owner_company_id" uuid NOT NULL,
        "name" character varying(160) NOT NULL,
        "description" text,
        "title" character varying(255) NOT NULL,
        "subtitle" text,
        "logo_url" character varying(500),
        "company_display_name" character varying(255),
        "contact_info" text,
        "text_document_id" uuid,
        "fields" jsonb NOT NULL DEFAULT '["firstName","lastName","phone","email"]',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_kvkk_forms_owner" FOREIGN KEY ("owner_company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_kvkk_forms_text" FOREIGN KEY ("text_document_id") REFERENCES "kvkk_text_documents"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "kvkk_form_checkboxes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "form_id" uuid NOT NULL,
        "label" character varying(500) NOT NULL,
        "is_required" boolean NOT NULL DEFAULT true,
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        CONSTRAINT "FK_kvkk_form_checkboxes_form" FOREIGN KEY ("form_id") REFERENCES "kvkk_forms"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "kvkk_qr_codes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "owner_company_id" uuid NOT NULL,
        "form_id" uuid NOT NULL,
        "name" character varying(160) NOT NULL,
        "description" text,
        "token" character varying(80) NOT NULL UNIQUE,
        "is_active" boolean NOT NULL DEFAULT true,
        "expires_at" TIMESTAMPTZ,
        "created_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_kvkk_qr_owner" FOREIGN KEY ("owner_company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_kvkk_qr_form" FOREIGN KEY ("form_id") REFERENCES "kvkk_forms"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "kvkk_form_links" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "owner_company_id" uuid NOT NULL,
        "form_id" uuid NOT NULL,
        "consent_id" uuid,
        "token" character varying(80) NOT NULL UNIQUE,
        "mobile_phone" character varying(40) NOT NULL,
        "normalized_phone" character varying(20) NOT NULL,
        "first_name" character varying(80),
        "last_name" character varying(80),
        "status" "kvkk_form_link_status_enum" NOT NULL DEFAULT 'PENDING',
        "expires_at" TIMESTAMPTZ,
        "created_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_kvkk_form_links_owner" FOREIGN KEY ("owner_company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_kvkk_form_links_form" FOREIGN KEY ("form_id") REFERENCES "kvkk_forms"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "kvkk_otp_challenges" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "owner_company_id" uuid NOT NULL,
        "consent_id" uuid,
        "mobile_phone" character varying(40) NOT NULL,
        "normalized_phone" character varying(20) NOT NULL,
        "code_hash" character varying(64) NOT NULL,
        "provider_ref" character varying(120),
        "status" "kvkk_otp_status_enum" NOT NULL DEFAULT 'SENT',
        "expires_at" TIMESTAMPTZ NOT NULL,
        "verified_at" TIMESTAMPTZ,
        "created_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_kvkk_otp_owner" FOREIGN KEY ("owner_company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "kvkk_consents" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "owner_company_id" uuid NOT NULL,
        "first_name" character varying(80),
        "last_name" character varying(80),
        "mobile_phone" character varying(40) NOT NULL,
        "normalized_phone" character varying(20) NOT NULL,
        "email" character varying(255),
        "status" "kvkk_consent_status_enum" NOT NULL DEFAULT 'PENDING',
        "method" "kvkk_consent_method_enum" NOT NULL,
        "form_id" uuid,
        "form_name_snapshot" character varying(160),
        "text_version_id" uuid,
        "text_version_number" integer,
        "text_title_snapshot" character varying(255),
        "text_body_snapshot" text,
        "checkbox_answers" jsonb,
        "form_payload" jsonb,
        "qr_id" uuid,
        "otp_challenge_id" uuid,
        "form_link_id" uuid,
        "approved_at" TIMESTAMPTZ,
        "cancelled_at" TIMESTAMPTZ,
        "cancelled_by" uuid,
        "cancel_source" character varying(80),
        "created_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_kvkk_consents_owner" FOREIGN KEY ("owner_company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_kvkk_consents_form" FOREIGN KEY ("form_id") REFERENCES "kvkk_forms"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_kvkk_consents_text_version" FOREIGN KEY ("text_version_id") REFERENCES "kvkk_text_versions"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_kvkk_consents_qr" FOREIGN KEY ("qr_id") REFERENCES "kvkk_qr_codes"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_kvkk_consents_owner_phone" ON "kvkk_consents" ("owner_company_id", "normalized_phone")`);
    await queryRunner.query(`CREATE INDEX "IDX_kvkk_consents_owner_status" ON "kvkk_consents" ("owner_company_id", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_kvkk_otp_owner_phone" ON "kvkk_otp_challenges" ("owner_company_id", "normalized_phone")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "kvkk_consents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "kvkk_otp_challenges"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "kvkk_form_links"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "kvkk_qr_codes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "kvkk_form_checkboxes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "kvkk_forms"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "kvkk_text_versions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "kvkk_text_documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "kvkk_settings"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "kvkk_form_link_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "kvkk_otp_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "kvkk_consent_method_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "kvkk_consent_status_enum"`);
    await queryRunner.query(`DELETE FROM "services" WHERE "code" = 'KVKK'`);
  }
}
