import { MigrationInterface, QueryRunner } from 'typeorm';

export class ContactCustomFields1730000000012 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "contact_custom_field_type_enum" AS ENUM ('TEXT', 'DATE', 'NUMBER');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      CREATE TABLE "contact_custom_fields" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "owner_company_id" uuid NOT NULL,
        "name" character varying(80) NOT NULL,
        "field_type" "contact_custom_field_type_enum" NOT NULL DEFAULT 'TEXT',
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "FK_contact_custom_fields_owner" FOREIGN KEY ("owner_company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_contact_custom_fields_owner_name"
      ON "contact_custom_fields" ("owner_company_id", lower("name"))
      WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "contact_custom_fields"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "contact_custom_field_type_enum"`);
  }
}
