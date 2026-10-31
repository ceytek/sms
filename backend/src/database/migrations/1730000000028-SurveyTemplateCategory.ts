import { MigrationInterface, QueryRunner } from 'typeorm';

export class SurveyTemplateCategory1730000000028 implements MigrationInterface {
  name = 'SurveyTemplateCategory1730000000028';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "survey_templates" ADD COLUMN IF NOT EXISTS "category" character varying(80)`);
    await queryRunner.query(`
      UPDATE "survey_templates" SET "category" = CASE "id"::text
        WHEN 'c0000001-0000-4000-8000-000000000001' THEN 'Müşteri Deneyimi'
        WHEN 'c0000001-0000-4000-8000-000000000002' THEN 'Müşteri Deneyimi'
        WHEN 'c0000001-0000-4000-8000-000000000003' THEN 'Ürün'
        WHEN 'c0000001-0000-4000-8000-000000000004' THEN 'Etkinlik'
        WHEN 'c0000001-0000-4000-8000-000000000005' THEN 'İnsan Kaynakları'
        WHEN 'c0000001-0000-4000-8000-000000000006' THEN 'Hizmet'
        ELSE "category"
      END
      WHERE "is_system" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "survey_templates" DROP COLUMN IF EXISTS "category"`);
  }
}
