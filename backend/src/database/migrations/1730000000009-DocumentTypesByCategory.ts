import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentTypesByCategory1730000000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "document_type_customer_types" a
      USING "document_type_customer_types" b
      WHERE a.document_type_id = b.document_type_id
        AND a.customer_category_id = b.customer_category_id
        AND a.ctid < b.ctid
    `);
    await queryRunner.query(`
      ALTER TABLE "document_type_customer_types"
      DROP CONSTRAINT IF EXISTS "UQ_document_type_subcategory"
    `);
    await queryRunner.query(`
      ALTER TABLE "document_type_customer_types"
      DROP CONSTRAINT IF EXISTS "FK_dtct_subcategory"
    `);
    await queryRunner.query(`
      ALTER TABLE "document_type_customer_types"
      DROP COLUMN IF EXISTS "customer_subcategory_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "document_type_customer_types"
      ADD CONSTRAINT "UQ_document_type_category"
      UNIQUE ("document_type_id", "customer_category_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "document_type_customer_types"
      DROP CONSTRAINT IF EXISTS "UQ_document_type_category"
    `);
    await queryRunner.query(`
      ALTER TABLE "document_type_customer_types"
      ADD COLUMN "customer_subcategory_id" uuid
    `);
  }
}
