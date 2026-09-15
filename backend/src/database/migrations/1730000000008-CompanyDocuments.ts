import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompanyDocuments1730000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "document_status_enum" AS ENUM ('pending', 'available', 'missing')
    `);
    await queryRunner.query(`
      CREATE TYPE "document_process_status_enum" AS ENUM ('in_progress', 'completed')
    `);

    await queryRunner.query(`
      CREATE TABLE "document_types" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" character varying(150) NOT NULL,
        "description" text,
        "is_required" boolean NOT NULL DEFAULT true,
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_document_types_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "document_type_customer_types" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "document_type_id" uuid NOT NULL,
        "customer_category_id" uuid NOT NULL,
        "customer_subcategory_id" uuid NOT NULL,
        "is_required" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_document_type_subcategory" UNIQUE ("document_type_id", "customer_subcategory_id"),
        CONSTRAINT "FK_dtct_document_type"
          FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_dtct_category"
          FOREIGN KEY ("customer_category_id") REFERENCES "customer_categories"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_dtct_subcategory"
          FOREIGN KEY ("customer_subcategory_id") REFERENCES "customer_subcategories"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "company_documents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "document_type_id" uuid,
        "custom_document_name" character varying(150),
        "document_status" "document_status_enum" NOT NULL DEFAULT 'pending',
        "file_name" character varying(255),
        "file_path" character varying(500),
        "missing_description" text,
        "uploaded_by" uuid,
        "uploaded_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "FK_company_documents_company"
          FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_company_documents_type"
          FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_company_documents_type"
      ON "company_documents" ("company_id", "document_type_id")
      WHERE "document_type_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_company_documents_company"
      ON "company_documents" ("company_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "company_document_process" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "status" "document_process_status_enum" NOT NULL DEFAULT 'in_progress',
        "completed_by" uuid,
        "completed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_company_document_process_company" UNIQUE ("company_id"),
        CONSTRAINT "FK_company_document_process_company"
          FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      INSERT INTO "document_types" ("name", "description", "is_required", "is_active", "sort_order")
      VALUES
        ('Vergi Levhası', 'Güncel vergi levhası', true, true, 10),
        ('İmza Sirküsü', 'Noter onaylı imza sirküsü', true, true, 20),
        ('Faaliyet Belgesi', 'Oda veya ilgili kurum faaliyet belgesi', true, true, 30),
        ('Ticaret Sicil Gazetesi', 'Tescil ilanı', false, true, 40),
        ('Oda Kayıt Belgesi', 'Meslek odası kayıt belgesi', true, true, 50),
        ('Dernek Tüzüğü', 'Dernek tüzüğü', true, true, 60),
        ('Yetki Belgesi', 'Yetkili kişi veya kurum belgesi', true, true, 70),
        ('Sözleşme', 'Hizmet veya üyelik sözleşmesi', false, true, 80),
        ('Kimlik Belgesi', 'Yetkili kişi kimlik fotokopisi', false, true, 90),
        ('Diğer', 'Diğer belgeler', false, true, 100)
    `);

    await queryRunner.query(`
      INSERT INTO "company_document_process" ("company_id", "status", "completed_at")
      SELECT
        "id",
        CASE WHEN "documents_completed" THEN 'completed'::"document_process_status_enum" ELSE 'in_progress'::"document_process_status_enum" END,
        CASE WHEN "documents_completed" THEN NOW() ELSE NULL END
      FROM "companies"
      WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "company_document_process"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "company_documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "document_type_customer_types"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "document_types"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "document_process_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "document_status_enum"`);
  }
}
