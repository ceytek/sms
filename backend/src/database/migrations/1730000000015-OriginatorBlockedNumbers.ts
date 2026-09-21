import { MigrationInterface, QueryRunner } from 'typeorm';

export class OriginatorBlockedNumbers1730000000015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "originator_restriction_type_enum" AS ENUM ('BLACKLIST', 'SMS_BLOCKED');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      CREATE TABLE "originator_blocked_numbers" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "owner_company_id" uuid NOT NULL,
        "originator_id" uuid NOT NULL,
        "restriction_type" "originator_restriction_type_enum" NOT NULL,
        "mobile_phone" character varying(40) NOT NULL,
        "normalized_phone" character varying(20) NOT NULL,
        "first_name" character varying(80),
        "last_name" character varying(80),
        "notes" text,
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "FK_originator_blocked_owner" FOREIGN KEY ("owner_company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_originator_blocked_originator" FOREIGN KEY ("originator_id") REFERENCES "company_originators"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_originator_blocked_phone"
      ON "originator_blocked_numbers" ("originator_id", "normalized_phone")
      WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_originator_blocked_owner_type" ON "originator_blocked_numbers" ("owner_company_id", "restriction_type")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "originator_blocked_numbers"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "originator_restriction_type_enum"`);
  }
}
