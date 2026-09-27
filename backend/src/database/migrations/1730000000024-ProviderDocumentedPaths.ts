import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProviderDocumentedPaths1730000000024 implements MigrationInterface {
  name = 'ProviderDocumentedPaths1730000000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "sms_providers"
      SET "config_schema" = jsonb_set(
        COALESCE("config_schema", '{}'::jsonb),
        '{api}',
        COALESCE("config_schema"->'api', '{}'::jsonb) || '{
          "sendPath": "/sms/create",
          "reportPath": "/sms/list",
          "detailReportPath": "/sms/list-item",
          "summaryPath": "/sms/summary",
          "sendersPath": "/sms/list-sender",
          "gatewaysPath": "/sms/list-gateway",
          "creditPath": "/user/credit",
          "creditMethod": "GET",
          "auth": "basic"
        }'::jsonb
      )
      WHERE "code" = 'KOCAELI'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "sms_providers"
      SET "config_schema" = jsonb_set(
        COALESCE("config_schema", '{}'::jsonb),
        '{api}',
        (COALESCE("config_schema"->'api', '{}'::jsonb)
          - 'reportPath' - 'detailReportPath' - 'sendersPath' - 'gatewaysPath' - 'creditPath' - 'creditMethod')
      )
      WHERE "code" = 'KOCAELI'
    `);
  }
}
