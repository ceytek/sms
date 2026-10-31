import { MigrationInterface, QueryRunner } from 'typeorm';

export class SurveyModule1730000000027 implements MigrationInterface {
  name = 'SurveyModule1730000000027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "services" ("id", "code", "name", "description", "is_active", "billing_period", "term_months")
      VALUES (
        'b0000001-0000-4000-8000-000000000008',
        'SURVEY',
        'Anket Hizmeti',
        'Anket oluşturma, dağıtım ve raporlama',
        true,
        'ANNUAL',
        12
      )
      ON CONFLICT ("code") DO NOTHING
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "surveys" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "name" character varying(160) NOT NULL,
        "form_title" character varying(200) NOT NULL DEFAULT '',
        "description" text,
        "logo_url" character varying(500),
        "company_name_override" character varying(255),
        "thank_you_message" text,
        "status" character varying(20) NOT NULL DEFAULT 'DRAFT',
        "anonymous" boolean NOT NULL DEFAULT false,
        "personalized" boolean NOT NULL DEFAULT true,
        "single_response" boolean NOT NULL DEFAULT true,
        "allow_edit" boolean NOT NULL DEFAULT false,
        "starts_at" TIMESTAMPTZ,
        "ends_at" TIMESTAMPTZ,
        "public_slug" character varying(80),
        "sms_body" text,
        "originator_id" uuid,
        "audience" jsonb,
        "public_open_count" integer NOT NULL DEFAULT 0,
        "created_by" uuid,
        "published_at" TIMESTAMPTZ,
        "closed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_surveys_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_surveys_public_slug" ON "surveys" ("public_slug") WHERE "public_slug" IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_surveys_company_status" ON "surveys" ("company_id", "status")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "survey_questions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "survey_id" uuid NOT NULL,
        "type" character varying(20) NOT NULL,
        "text" character varying(500) NOT NULL,
        "description" text,
        "required" boolean NOT NULL DEFAULT false,
        "position" integer NOT NULL DEFAULT 0,
        "show_when" jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_survey_questions_survey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_survey_questions_survey" ON "survey_questions" ("survey_id", "position")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "survey_options" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "question_id" uuid NOT NULL,
        "label" character varying(200) NOT NULL,
        "position" integer NOT NULL DEFAULT 0,
        CONSTRAINT "FK_survey_options_question" FOREIGN KEY ("question_id") REFERENCES "survey_questions"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "survey_recipients" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "survey_id" uuid NOT NULL,
        "company_id" uuid NOT NULL,
        "contact_id" uuid,
        "normalized_phone" character varying(20) NOT NULL,
        "display_name" character varying(160),
        "token" character varying(64) NOT NULL,
        "invite_status" character varying(20) NOT NULL DEFAULT 'NOT_SENT',
        "sms_campaign_id" uuid,
        "sms_recipient_id" uuid,
        "opened_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ,
        "completed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_survey_recipients_survey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_survey_recipients_phone" UNIQUE ("survey_id", "normalized_phone")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_survey_recipients_token" ON "survey_recipients" ("token")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_survey_recipients_status" ON "survey_recipients" ("survey_id", "invite_status")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "survey_responses" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "survey_id" uuid NOT NULL,
        "company_id" uuid NOT NULL,
        "recipient_id" uuid,
        "session_key" character varying(80),
        "channel" character varying(20) NOT NULL DEFAULT 'PUBLIC',
        "status" character varying(20) NOT NULL DEFAULT 'PARTIAL',
        "started_at" TIMESTAMPTZ,
        "completed_at" TIMESTAMPTZ,
        "duration_seconds" integer,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_survey_responses_survey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_survey_responses_recipient" FOREIGN KEY ("recipient_id") REFERENCES "survey_recipients"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_survey_responses_survey" ON "survey_responses" ("survey_id", "created_at")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_survey_responses_session" ON "survey_responses" ("survey_id", "session_key") WHERE "session_key" IS NOT NULL`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "survey_answers" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "response_id" uuid NOT NULL,
        "question_id" uuid NOT NULL,
        "option_id" uuid,
        "value_text" text,
        "value_number" numeric,
        "value_json" jsonb,
        CONSTRAINT "FK_survey_answers_response" FOREIGN KEY ("response_id") REFERENCES "survey_responses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_survey_answers_question" FOREIGN KEY ("question_id") REFERENCES "survey_questions"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_survey_answers_response" ON "survey_answers" ("response_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_survey_answers_question" ON "survey_answers" ("question_id")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "survey_templates" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "company_id" uuid,
        "name" character varying(160) NOT NULL,
        "description" text,
        "definition" jsonb NOT NULL,
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "survey_settings" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL UNIQUE,
        "default_thank_you" text,
        "default_sms_body" text,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_survey_settings_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "survey_campaigns" (
        "survey_id" uuid NOT NULL,
        "campaign_id" uuid NOT NULL,
        "kind" character varying(20) NOT NULL DEFAULT 'SEND',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY ("survey_id", "campaign_id"),
        CONSTRAINT "FK_survey_campaigns_survey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`ALTER TABLE "sms_campaigns" ADD COLUMN IF NOT EXISTS "survey_id" uuid`);

    await queryRunner.query(`
      INSERT INTO "survey_templates" ("id", "name", "description", "definition", "is_system")
      VALUES
        (
          'c0000001-0000-4000-8000-000000000001',
          'Müşteri Memnuniyeti',
          'Hizmet sonrası memnuniyet anketi',
          '{"questions":[{"type":"STARS","text":"Hizmetimizi genel olarak nasıl değerlendirirsiniz?","required":true},{"type":"SINGLE","text":"Hizmetimizden memnun musunuz?","required":true,"options":["Çok Memnunum","Memnunum","Kararsızım","Memnun Değilim","Hiç Memnun Değilim"]},{"type":"LONG_TEXT","text":"Eklemek istediğiniz bir görüş var mı?","required":false}]}'::jsonb,
          true
        ),
        (
          'c0000001-0000-4000-8000-000000000002',
          'NPS',
          'Tavsiye skoru anketi',
          '{"questions":[{"type":"NPS","text":"Bizi bir arkadaşınıza tavsiye etme olasılığınız nedir?","required":true},{"type":"LONG_TEXT","text":"Bu puanı vermenizin nedeni nedir?","required":false}]}'::jsonb,
          true
        ),
        (
          'c0000001-0000-4000-8000-000000000003',
          'Ürün Memnuniyeti',
          'Ürün deneyimi anketi',
          '{"questions":[{"type":"RATING","text":"Ürünü 1 ile 5 arasında puanlayın","required":true},{"type":"MULTI","text":"Ürünün hangi yönlerini beğendiniz?","required":false,"options":["Kalite","Fiyat","Teslimat","Ambalaj","Kullanım kolaylığı"]},{"type":"SHORT_TEXT","text":"Ürün adı","required":false}]}'::jsonb,
          true
        ),
        (
          'c0000001-0000-4000-8000-000000000004',
          'Etkinlik Sonrası',
          'Etkinlik değerlendirme anketi',
          '{"questions":[{"type":"STARS","text":"Etkinliği nasıl buldunuz?","required":true},{"type":"YES_NO","text":"Bir sonraki etkinliğe katılır mısınız?","required":true},{"type":"LONG_TEXT","text":"Öneriniz","required":false}]}'::jsonb,
          true
        ),
        (
          'c0000001-0000-4000-8000-000000000005',
          'Çalışan Memnuniyeti',
          'Çalışan deneyimi anketi',
          '{"questions":[{"type":"RATING","text":"Çalışma ortamınızı puanlayın","required":true},{"type":"SINGLE","text":"Yöneticinizden yeterli destek alıyor musunuz?","required":true,"options":["Evet","Kısmen","Hayır"]},{"type":"LONG_TEXT","text":"İyileştirmek istediğiniz bir konu","required":false}]}'::jsonb,
          true
        ),
        (
          'c0000001-0000-4000-8000-000000000006',
          'Hizmet Değerlendirme',
          'Kısa hizmet değerlendirmesi',
          '{"questions":[{"type":"YES_NO","text":"Sorununuz çözüldü mü?","required":true},{"type":"STARS","text":"Temsilciyi puanlayın","required":true},{"type":"DATE","text":"Hizmet tarihi","required":false}]}'::jsonb,
          true
        )
      ON CONFLICT ("id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sms_campaigns" DROP COLUMN IF EXISTS "survey_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "survey_campaigns"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "survey_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "survey_answers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "survey_responses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "survey_recipients"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "survey_options"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "survey_questions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "survey_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "surveys"`);
    await queryRunner.query(`DELETE FROM "services" WHERE "code" = 'SURVEY'`);
  }
}
