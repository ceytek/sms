import { MigrationInterface, QueryRunner } from 'typeorm';

export class AnnualServiceTerms1730000000017 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "service_billing_period_enum" AS ENUM ('ALWAYS', 'ANNUAL');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    await queryRunner.query(`
      ALTER TABLE "services"
        ADD COLUMN IF NOT EXISTS "billing_period" "service_billing_period_enum" NOT NULL DEFAULT 'ALWAYS',
        ADD COLUMN IF NOT EXISTS "term_months" integer NOT NULL DEFAULT 12
    `);

    await queryRunner.query(`
      UPDATE "services"
      SET "billing_period" = 'ALWAYS'
      WHERE "code" IN ('SMS', 'AI')
    `);

    await queryRunner.query(`
      UPDATE "services"
      SET "billing_period" = 'ANNUAL', "term_months" = 12
      WHERE "code" NOT IN ('SMS', 'AI')
    `);

    await queryRunner.query(`
      ALTER TABLE "company_services"
        ADD COLUMN IF NOT EXISTS "starts_year" integer
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "company_service_terms" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "company_service_id" uuid NOT NULL,
        "company_id" uuid NOT NULL,
        "service_id" uuid NOT NULL,
        "starts_year" integer NOT NULL,
        "started_at" date NOT NULL,
        "expires_at" date NOT NULL,
        "is_current" boolean NOT NULL DEFAULT true,
        "created_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_company_service_terms_assignment"
          FOREIGN KEY ("company_service_id") REFERENCES "company_services"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_company_service_terms_company"
          FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_company_service_terms_service"
          FOREIGN KEY ("service_id") REFERENCES "services"("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_company_service_terms_current"
        ON "company_service_terms" ("company_id", "service_id", "is_current")
    `);

    await queryRunner.query(`
      UPDATE "company_services" cs
      SET
        "start_date" = COALESCE(cs."start_date", cs."created_at"::date),
        "end_date" = COALESCE(
          cs."end_date",
          (COALESCE(cs."start_date", cs."created_at"::date) + INTERVAL '1 year')::date
        ),
        "starts_year" = EXTRACT(
          YEAR FROM COALESCE(cs."start_date", cs."created_at"::date)
        )::int
      FROM "services" s
      WHERE cs."service_id" = s."id"
        AND s."billing_period" = 'ANNUAL'
        AND (cs."start_date" IS NULL OR cs."end_date" IS NULL OR cs."starts_year" IS NULL)
    `);

    await queryRunner.query(`
      INSERT INTO "company_service_terms" (
        "company_service_id",
        "company_id",
        "service_id",
        "starts_year",
        "started_at",
        "expires_at",
        "is_current"
      )
      SELECT
        cs."id",
        cs."company_id",
        cs."service_id",
        cs."starts_year",
        cs."start_date",
        cs."end_date",
        true
      FROM "company_services" cs
      INNER JOIN "services" s ON s."id" = cs."service_id"
      WHERE s."billing_period" = 'ANNUAL'
        AND cs."start_date" IS NOT NULL
        AND cs."end_date" IS NOT NULL
        AND cs."starts_year" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "company_service_terms" term
          WHERE term."company_service_id" = cs."id"
            AND term."is_current" = true
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "company_service_terms"`);
    await queryRunner.query(`ALTER TABLE "company_services" DROP COLUMN IF EXISTS "starts_year"`);
    await queryRunner.query(`ALTER TABLE "services" DROP COLUMN IF EXISTS "term_months"`);
    await queryRunner.query(`ALTER TABLE "services" DROP COLUMN IF EXISTS "billing_period"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "service_billing_period_enum"`);
  }
}
