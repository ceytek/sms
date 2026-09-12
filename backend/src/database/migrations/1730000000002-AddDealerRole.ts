import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDealerRole1730000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'DEALER'`,
    );
    await queryRunner.query(
      `ALTER TYPE "price_lists_list_type_enum" ADD VALUE IF NOT EXISTS 'CUSTOMER'`,
    );
  }

  public async down(): Promise<void> {
    // PostgreSQL does not support removing values from an enum type.
    // To revert, you would need to recreate the enum without the value.
  }
}
