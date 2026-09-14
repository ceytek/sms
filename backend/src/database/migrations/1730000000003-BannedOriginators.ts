import { MigrationInterface, QueryRunner } from 'typeorm';

export class BannedOriginators1730000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "banned_originators" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(11) NOT NULL,
        "reason" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_by" uuid,
        CONSTRAINT "PK_banned_originators" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_banned_originators_name" UNIQUE ("name")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "banned_originators"`);
  }
}
