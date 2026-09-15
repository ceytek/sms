import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentTypeAppliesToAll1730000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "document_types"
      ADD COLUMN "applies_to_all" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "document_types"
      DROP COLUMN IF EXISTS "applies_to_all"
    `);
  }
}
