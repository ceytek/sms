import { MigrationInterface, QueryRunner } from 'typeorm';

export class InboxNotifications1730000000016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "inbox_notifications" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "recipient_company_id" uuid NOT NULL,
        "recipient_user_id" uuid,
        "event_type" character varying(80) NOT NULL,
        "title" character varying(255) NOT NULL,
        "body" text NOT NULL,
        "href" character varying(255),
        "payload" jsonb,
        "read_at" TIMESTAMPTZ,
        "actor_id" uuid,
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "FK_inbox_recipient_company" FOREIGN KEY ("recipient_company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_inbox_recipient_created" ON "inbox_notifications" ("recipient_company_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_inbox_recipient_unread" ON "inbox_notifications" ("recipient_company_id", "recipient_user_id", "read_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "inbox_notifications"`);
  }
}
