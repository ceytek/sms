import { MigrationInterface, QueryRunner } from 'typeorm';

export class ContactBook1730000000011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "contact_status_enum" AS ENUM ('ACTIVE', 'PASSIVE', 'BLACKLIST', 'SMS_BLOCKED');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "contact_source_enum" AS ENUM ('MANUAL', 'EXCEL', 'CSV', 'BULK_NUMBERS', 'COMPANY_IMPORT', 'API');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "contact_import_type_enum" AS ENUM ('EXCEL', 'CSV', 'BULK_NUMBERS', 'COMPANY');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "contact_import_status_enum" AS ENUM ('PREVIEW', 'COMPLETED', 'FAILED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "contact_duplicate_policy_enum" AS ENUM ('SKIP', 'UPDATE', 'ADD_TO_GROUP');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "contact_import_error_type_enum" AS ENUM (
          'MISSING_PHONE', 'INVALID_PHONE', 'DUPLICATE', 'EXISTS', 'MISSING_REQUIRED', 'OTHER'
        );
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    await queryRunner.query(`
      CREATE TABLE "contact_groups" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "owner_company_id" uuid NOT NULL,
        "parent_id" uuid,
        "name" character varying(120) NOT NULL,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "FK_contact_groups_owner" FOREIGN KEY ("owner_company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_contact_groups_parent" FOREIGN KEY ("parent_id") REFERENCES "contact_groups"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_contact_groups_owner_name"
      ON "contact_groups" ("owner_company_id", lower("name"))
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "contact_tags" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "owner_company_id" uuid NOT NULL,
        "name" character varying(80) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "FK_contact_tags_owner" FOREIGN KEY ("owner_company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_contact_tags_owner_name"
      ON "contact_tags" ("owner_company_id", lower("name"))
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "contacts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "owner_company_id" uuid NOT NULL,
        "first_name" character varying(80),
        "last_name" character varying(80),
        "mobile_phone" character varying(40) NOT NULL,
        "normalized_phone" character varying(20) NOT NULL,
        "email" character varying(255),
        "company_name" character varying(255),
        "source_company_id" uuid,
        "source" "contact_source_enum" NOT NULL DEFAULT 'MANUAL',
        "status" "contact_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "notes" text,
        "custom_fields" jsonb,
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "FK_contacts_owner" FOREIGN KEY ("owner_company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_contacts_source_company" FOREIGN KEY ("source_company_id") REFERENCES "companies"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_contacts_owner_phone"
      ON "contacts" ("owner_company_id", "normalized_phone")
      WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`CREATE INDEX "IDX_contacts_owner_status" ON "contacts" ("owner_company_id", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_contacts_owner_source" ON "contacts" ("owner_company_id", "source")`);

    await queryRunner.query(`
      CREATE TABLE "contact_group_members" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "contact_id" uuid NOT NULL,
        "group_id" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_contact_group_members_contact" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_contact_group_members_group" FOREIGN KEY ("group_id") REFERENCES "contact_groups"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_contact_group_members" UNIQUE ("contact_id", "group_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "contact_tag_members" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "contact_id" uuid NOT NULL,
        "tag_id" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_contact_tag_members_contact" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_contact_tag_members_tag" FOREIGN KEY ("tag_id") REFERENCES "contact_tags"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_contact_tag_members" UNIQUE ("contact_id", "tag_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "contact_import_jobs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "owner_company_id" uuid NOT NULL,
        "file_name" character varying(255),
        "import_type" "contact_import_type_enum" NOT NULL,
        "status" "contact_import_status_enum" NOT NULL DEFAULT 'PREVIEW',
        "duplicate_policy" "contact_duplicate_policy_enum" NOT NULL DEFAULT 'SKIP',
        "columns" jsonb,
        "mapping" jsonb,
        "raw_rows" jsonb,
        "total_rows" integer NOT NULL DEFAULT 0,
        "valid_rows" integer NOT NULL DEFAULT 0,
        "successful_rows" integer NOT NULL DEFAULT 0,
        "failed_rows" integer NOT NULL DEFAULT 0,
        "duplicate_rows" integer NOT NULL DEFAULT 0,
        "existing_rows" integer NOT NULL DEFAULT 0,
        "created_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "completed_at" TIMESTAMPTZ,
        CONSTRAINT "FK_contact_import_jobs_owner" FOREIGN KEY ("owner_company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "contact_import_errors" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "import_job_id" uuid NOT NULL,
        "row_number" integer,
        "raw_data" jsonb,
        "error_type" "contact_import_error_type_enum" NOT NULL,
        "error_message" character varying(500) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_contact_import_errors_job" FOREIGN KEY ("import_job_id") REFERENCES "contact_import_jobs"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "contact_import_errors"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contact_import_jobs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contact_tag_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contact_group_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contacts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contact_tags"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contact_groups"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "contact_import_error_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "contact_duplicate_policy_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "contact_import_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "contact_import_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "contact_source_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "contact_status_enum"`);
  }
}
