import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreditLoadMeta1730000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      ADD COLUMN IF NOT EXISTS "unit_price" numeric(12,4),
      ADD COLUMN IF NOT EXISTS "price_list_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      DROP CONSTRAINT IF EXISTS "FK_wallet_transactions_price_list"
    `);
    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      ADD CONSTRAINT "FK_wallet_transactions_price_list"
      FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      DROP CONSTRAINT IF EXISTS "FK_wallet_transactions_price_list"
    `);
    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      DROP COLUMN IF EXISTS "price_list_id",
      DROP COLUMN IF EXISTS "unit_price"
    `);
  }
}
