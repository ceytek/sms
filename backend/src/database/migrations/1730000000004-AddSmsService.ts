import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSmsService1730000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "services" ("id", "code", "name", "description", "is_active")
      VALUES (
        'b0000001-0000-4000-8000-000000000006',
        'SMS',
        'SMS Servisi',
        'SMS gönderim servisi',
        true
      )
      ON CONFLICT ("code") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "company_services" ("company_id", "service_id", "is_active")
      SELECT c.id, s.id, true
      FROM "companies" c
      CROSS JOIN "services" s
      WHERE s.code = 'SMS'
        AND NOT EXISTS (
          SELECT 1
          FROM "company_services" cs
          WHERE cs.company_id = c.id
            AND cs.service_id = s.id
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "company_services"
      WHERE "service_id" IN (SELECT "id" FROM "services" WHERE "code" = 'SMS')
    `);
    await queryRunner.query(`DELETE FROM "services" WHERE "code" = 'SMS'`);
  }
}
