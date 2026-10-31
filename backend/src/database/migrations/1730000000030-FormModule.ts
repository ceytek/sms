import { MigrationInterface, QueryRunner } from 'typeorm';

export class FormModule1730000000030 implements MigrationInterface {
  name = 'FormModule1730000000030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "services" ("id", "code", "name", "description", "is_active", "billing_period", "term_months")
      VALUES (
        'b0000001-0000-4000-8000-000000000009',
        'FORM',
        'Form Hizmeti',
        'Form oluşturma, dağıtım ve kayıt toplama',
        true,
        'ANNUAL',
        12
      )
      ON CONFLICT ("code") DO NOTHING
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "forms" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "name" character varying(160) NOT NULL,
        "title" character varying(200) NOT NULL DEFAULT '',
        "description" text,
        "logo_url" character varying(500),
        "company_name_override" character varying(255),
        "thank_you_message" text,
        "status" character varying(20) NOT NULL DEFAULT 'DRAFT',
        "personalized" boolean NOT NULL DEFAULT false,
        "single_submission" boolean NOT NULL DEFAULT false,
        "allow_edit" boolean NOT NULL DEFAULT false,
        "starts_at" TIMESTAMPTZ,
        "ends_at" TIMESTAMPTZ,
        "max_submissions" integer,
        "public_slug" character varying(80),
        "sms_body" text,
        "originator_id" uuid,
        "audience" jsonb,
        "submission_count" integer NOT NULL DEFAULT 0,
        "created_by" uuid,
        "published_at" TIMESTAMPTZ,
        "closed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_forms_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_forms_company_id" ON "forms" ("company_id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_forms_slug" ON "forms" ("public_slug") WHERE "public_slug" IS NOT NULL`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "form_fields" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "form_id" uuid NOT NULL,
        "type" character varying(30) NOT NULL,
        "label" character varying(300) NOT NULL,
        "description" text,
        "placeholder" character varying(300),
        "required" boolean NOT NULL DEFAULT false,
        "default_value" text,
        "position" integer NOT NULL DEFAULT 0,
        "validation" jsonb,
        "options" jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_form_fields_form" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_form_fields_form_id" ON "form_fields" ("form_id")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "form_recipients" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "form_id" uuid NOT NULL,
        "company_id" uuid NOT NULL,
        "name" character varying(200),
        "phone" character varying(30),
        "normalized_phone" character varying(20),
        "email" character varying(200),
        "token" character varying(40) NOT NULL,
        "invite_status" character varying(20) NOT NULL DEFAULT 'PENDING',
        "opened_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ,
        "completed_at" TIMESTAMPTZ,
        "sms_recipient_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_form_recipients_form" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_form_recipients_form" ON "form_recipients" ("form_id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_form_recipients_token" ON "form_recipients" ("token")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "form_submissions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "form_id" uuid NOT NULL,
        "company_id" uuid NOT NULL,
        "recipient_id" uuid,
        "session_key" character varying(80),
        "channel" character varying(20) NOT NULL DEFAULT 'PUBLIC',
        "status" character varying(20) NOT NULL DEFAULT 'NEW',
        "data" jsonb NOT NULL DEFAULT '{}',
        "ip_address" character varying(45),
        "source" character varying(20),
        "started_at" TIMESTAMPTZ,
        "completed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_form_submissions_form" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_form_submissions_recipient" FOREIGN KEY ("recipient_id") REFERENCES "form_recipients"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_form_submissions_form" ON "form_submissions" ("form_id")`);
    await queryRunner.query(`CREATE INDEX "idx_form_submissions_company" ON "form_submissions" ("company_id")`);
    await queryRunner.query(`CREATE INDEX "idx_form_submissions_status" ON "form_submissions" ("form_id", "status")`);
    await queryRunner.query(`CREATE INDEX "idx_form_submissions_created" ON "form_submissions" ("form_id", "created_at" DESC)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "form_files" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "submission_id" uuid NOT NULL,
        "field_id" uuid NOT NULL,
        "company_id" uuid NOT NULL,
        "file_name" character varying(500) NOT NULL,
        "file_path" character varying(1000) NOT NULL,
        "file_size" integer NOT NULL DEFAULT 0,
        "mime_type" character varying(100),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_form_files_submission" FOREIGN KEY ("submission_id") REFERENCES "form_submissions"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_form_files_submission" ON "form_files" ("submission_id")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "form_templates" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "company_id" uuid,
        "name" character varying(160) NOT NULL,
        "description" text,
        "category" character varying(80),
        "definition" jsonb NOT NULL DEFAULT '{}',
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "form_campaigns" (
        "form_id" uuid NOT NULL,
        "campaign_id" uuid NOT NULL,
        "kind" character varying(20) NOT NULL DEFAULT 'SEND',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY ("form_id", "campaign_id")
      )
    `);

    // System form templates
    await queryRunner.query(`
      INSERT INTO "form_templates" ("id", "company_id", "name", "description", "category", "definition", "is_system") VALUES
      ('c0000001-0000-4000-8000-000000000001', NULL, 'İletişim Formu', 'Müşteri iletişim bilgilerini toplama formu', 'Genel',
       '{"fields":[{"type":"FIRST_NAME","label":"Adınız","required":true},{"type":"LAST_NAME","label":"Soyadınız","required":true},{"type":"PHONE","label":"Telefon","required":true},{"type":"EMAIL","label":"E-posta","required":false},{"type":"LONG_TEXT","label":"Mesajınız","required":true}]}', true),
      ('c0000001-0000-4000-8000-000000000002', NULL, 'Etkinlik Katılım Formu', 'Etkinlik kayıt formu', 'Etkinlik',
       '{"fields":[{"type":"FIRST_NAME","label":"Adınız","required":true},{"type":"LAST_NAME","label":"Soyadınız","required":true},{"type":"PHONE","label":"Telefon","required":true},{"type":"EMAIL","label":"E-posta","required":true},{"type":"CITY","label":"Şehir","required":false},{"type":"SINGLE_CHOICE","label":"Katılım Şekli","required":true,"options":[{"label":"Yüz yüze","position":0},{"label":"Online","position":1}]}]}', true),
      ('c0000001-0000-4000-8000-000000000003', NULL, 'Bayi Başvuru Formu', 'Bayilik başvurusu', 'Başvuru',
       '{"fields":[{"type":"FIRST_NAME","label":"Yetkili Adı","required":true},{"type":"LAST_NAME","label":"Yetkili Soyadı","required":true},{"type":"SHORT_TEXT","label":"Firma Adı","required":true},{"type":"PHONE","label":"Telefon","required":true},{"type":"EMAIL","label":"E-posta","required":true},{"type":"CITY","label":"Şehir","required":true},{"type":"DISTRICT","label":"İlçe","required":false},{"type":"ADDRESS","label":"Adres","required":false},{"type":"LONG_TEXT","label":"Başvuru Notları","required":false}]}', true),
      ('c0000001-0000-4000-8000-000000000004', NULL, 'Üyelik Formu', 'Üyelik başvuru formu', 'Üyelik',
       '{"fields":[{"type":"FIRST_NAME","label":"Adınız","required":true},{"type":"LAST_NAME","label":"Soyadınız","required":true},{"type":"PHONE","label":"Telefon","required":true},{"type":"EMAIL","label":"E-posta","required":true},{"type":"DATE","label":"Doğum Tarihi","required":false},{"type":"CITY","label":"Şehir","required":false}]}', true),
      ('c0000001-0000-4000-8000-000000000005', NULL, 'Talep Formu', 'Genel talep/istek formu', 'Genel',
       '{"fields":[{"type":"FIRST_NAME","label":"Adınız","required":true},{"type":"LAST_NAME","label":"Soyadınız","required":true},{"type":"PHONE","label":"Telefon","required":true},{"type":"DROPDOWN","label":"Talep Türü","required":true,"options":[{"label":"Bilgi","position":0},{"label":"Şikayet","position":1},{"label":"Öneri","position":2},{"label":"Diğer","position":3}]},{"type":"LONG_TEXT","label":"Açıklama","required":true}]}', true),
      ('c0000001-0000-4000-8000-000000000006', NULL, 'İş Başvuru Formu', 'İş başvurusu', 'Başvuru',
       '{"fields":[{"type":"FIRST_NAME","label":"Adınız","required":true},{"type":"LAST_NAME","label":"Soyadınız","required":true},{"type":"PHONE","label":"Telefon","required":true},{"type":"EMAIL","label":"E-posta","required":true},{"type":"DATE","label":"Doğum Tarihi","required":false},{"type":"SHORT_TEXT","label":"Pozisyon","required":true},{"type":"LONG_TEXT","label":"Deneyim ve Notlar","required":false},{"type":"FILE_UPLOAD","label":"CV","required":false}]}', true),
      ('c0000001-0000-4000-8000-000000000007', NULL, 'Randevu Talebi', 'Randevu isteme formu', 'Genel',
       '{"fields":[{"type":"FIRST_NAME","label":"Adınız","required":true},{"type":"LAST_NAME","label":"Soyadınız","required":true},{"type":"PHONE","label":"Telefon","required":true},{"type":"DATE","label":"Tercih Edilen Tarih","required":true},{"type":"TIME","label":"Tercih Edilen Saat","required":false},{"type":"LONG_TEXT","label":"Not","required":false}]}', true),
      ('c0000001-0000-4000-8000-000000000008', NULL, 'Ön Kayıt Formu', 'Ön kayıt ve bilgi toplama', 'Genel',
       '{"fields":[{"type":"FIRST_NAME","label":"Adınız","required":true},{"type":"LAST_NAME","label":"Soyadınız","required":true},{"type":"PHONE","label":"Telefon","required":true},{"type":"EMAIL","label":"E-posta","required":false},{"type":"SHORT_TEXT","label":"Kurum/Firma","required":false},{"type":"CHECKBOX","label":"Bilgilendirme almak istiyorum","required":false}]}', true)
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      ALTER TABLE "sms_campaigns" ADD COLUMN IF NOT EXISTS "form_id" uuid
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sms_campaigns" DROP COLUMN IF EXISTS "form_id"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "form_campaigns"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "form_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "form_files"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "form_submissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "form_recipients"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "form_fields"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "forms"`);
    await queryRunner.query(`DELETE FROM "services" WHERE "code" = 'FORM'`);
  }
}
