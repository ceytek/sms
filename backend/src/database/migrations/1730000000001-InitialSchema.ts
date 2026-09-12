import { MigrationInterface, QueryRunner } from 'typeorm';

const TURKISH_CITIES: Array<[number, string, string]> = [
  [1, 'Adana', '01'],
  [2, 'Adıyaman', '02'],
  [3, 'Afyonkarahisar', '03'],
  [4, 'Ağrı', '04'],
  [5, 'Amasya', '05'],
  [6, 'Ankara', '06'],
  [7, 'Antalya', '07'],
  [8, 'Artvin', '08'],
  [9, 'Aydın', '09'],
  [10, 'Balıkesir', '10'],
  [11, 'Bilecik', '11'],
  [12, 'Bingöl', '12'],
  [13, 'Bitlis', '13'],
  [14, 'Bolu', '14'],
  [15, 'Burdur', '15'],
  [16, 'Bursa', '16'],
  [17, 'Çanakkale', '17'],
  [18, 'Çankırı', '18'],
  [19, 'Çorum', '19'],
  [20, 'Denizli', '20'],
  [21, 'Diyarbakır', '21'],
  [22, 'Edirne', '22'],
  [23, 'Elazığ', '23'],
  [24, 'Erzincan', '24'],
  [25, 'Erzurum', '25'],
  [26, 'Eskişehir', '26'],
  [27, 'Gaziantep', '27'],
  [28, 'Giresun', '28'],
  [29, 'Gümüşhane', '29'],
  [30, 'Hakkari', '30'],
  [31, 'Hatay', '31'],
  [32, 'Isparta', '32'],
  [33, 'Mersin', '33'],
  [34, 'İstanbul', '34'],
  [35, 'İzmir', '35'],
  [36, 'Kars', '36'],
  [37, 'Kastamonu', '37'],
  [38, 'Kayseri', '38'],
  [39, 'Kırklareli', '39'],
  [40, 'Kırşehir', '40'],
  [41, 'Kocaeli', '41'],
  [42, 'Konya', '42'],
  [43, 'Kütahya', '43'],
  [44, 'Malatya', '44'],
  [45, 'Manisa', '45'],
  [46, 'Kahramanmaraş', '46'],
  [47, 'Mardin', '47'],
  [48, 'Muğla', '48'],
  [49, 'Muş', '49'],
  [50, 'Nevşehir', '50'],
  [51, 'Niğde', '51'],
  [52, 'Ordu', '52'],
  [53, 'Rize', '53'],
  [54, 'Sakarya', '54'],
  [55, 'Samsun', '55'],
  [56, 'Siirt', '56'],
  [57, 'Sinop', '57'],
  [58, 'Sivas', '58'],
  [59, 'Tekirdağ', '59'],
  [60, 'Tokat', '60'],
  [61, 'Trabzon', '61'],
  [62, 'Tunceli', '62'],
  [63, 'Şanlıurfa', '63'],
  [64, 'Uşak', '64'],
  [65, 'Van', '65'],
  [66, 'Yozgat', '66'],
  [67, 'Zonguldak', '67'],
  [68, 'Aksaray', '68'],
  [69, 'Bayburt', '69'],
  [70, 'Karaman', '70'],
  [71, 'Kırıkkale', '71'],
  [72, 'Batman', '72'],
  [73, 'Şırnak', '73'],
  [74, 'Bartın', '74'],
  [75, 'Ardahan', '75'],
  [76, 'Iğdır', '76'],
  [77, 'Yalova', '77'],
  [78, 'Karabük', '78'],
  [79, 'Kilis', '79'],
  [80, 'Osmaniye', '80'],
  [81, 'Düzce', '81'],
];

export class InitialSchema1730000000001 implements MigrationInterface {
  name = 'InitialSchema1730000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    const enumTypes: Array<[string, string]> = [
      ['companies_company_type_enum', "'CORPORATE', 'INDIVIDUAL'"],
      ['companies_status_enum', "'ACTIVE', 'PASSIVE', 'SUSPENDED'"],
      ['users_role_enum', "'ADMIN', 'CUSTOMER'"],
      [
        'company_contacts_contact_type_enum',
        "'MANAGER', 'TECHNICAL', 'ACCOUNTING', 'PERSONNEL'",
      ],
      [
        'company_originators_status_enum',
        "'PENDING', 'ACTIVE', 'REJECTED', 'PASSIVE'",
      ],
      [
        'company_iys_settings_status_enum',
        "'PASSIVE', 'ACTIVE', 'SYNC_CHANGES_ONLY'",
      ],
      [
        'company_security_settings_ip_rule_type_enum',
        "'NO_CONTROL', 'ALLOW_LIST', 'BLOCK_LIST'",
      ],
      [
        'company_credit_alerts_notification_type_enum',
        "'EMAIL', 'SMS', 'BOTH'",
      ],
      ['products_product_type_enum', "'SMS', 'AI'"],
      ['price_lists_list_type_enum', "'PLATFORM', 'DEALER'"],
      ['wallets_wallet_type_enum', "'SMS', 'AI'"],
      [
        'wallet_transactions_transaction_type_enum',
        "'CREDIT', 'DEBIT', 'REFUND', 'ADJUSTMENT'",
      ],
      [
        'company_credentials_credential_type_enum',
        "'SMS_PASSWORD', 'SMS_API_KEY', 'IYS_API_KEY', 'SERVICE_API_KEY', 'FILE_PASSWORD'",
      ],
    ];

    for (const [typeName, values] of enumTypes) {
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE "${typeName}" AS ENUM (${values});
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
    }

    // Phase 1'den kalan eski users tablosunu temizle (sadece companies yoksa)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'companies'
        ) AND EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'users'
        ) THEN
          DROP TABLE "users" CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE "cities" (
        "id" smallint NOT NULL,
        "name" character varying(100) NOT NULL,
        "plate_code" character varying(2) NOT NULL,
        CONSTRAINT "PK_cities" PRIMARY KEY ("id")
      );

      CREATE TABLE "districts" (
        "id" SERIAL NOT NULL,
        "city_id" smallint NOT NULL,
        "name" character varying(100) NOT NULL,
        CONSTRAINT "PK_districts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_districts_city" FOREIGN KEY ("city_id") REFERENCES "cities"("id")
      );

      CREATE TABLE "sms_providers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying(50) NOT NULL,
        "name" character varying(100) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "config_schema" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sms_providers" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_sms_providers_code" UNIQUE ("code")
      );

      CREATE TABLE "services" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying(50) NOT NULL,
        "name" character varying(100) NOT NULL,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_services" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_services_code" UNIQUE ("code")
      );

      CREATE TABLE "products" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying(50) NOT NULL,
        "name" character varying(100) NOT NULL,
        "credit_amount" integer NOT NULL,
        "product_type" "products_product_type_enum" NOT NULL DEFAULT 'SMS',
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_products" PRIMARY KEY ("id")
      );

      CREATE TABLE "companies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_code" character varying(20) NOT NULL,
        "name" character varying(255) NOT NULL,
        "company_type" "companies_company_type_enum" NOT NULL,
        "status" "companies_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "is_sub_account" boolean NOT NULL DEFAULT false,
        "is_dealer" boolean NOT NULL DEFAULT false,
        "parent_company_id" uuid,
        "dealer_company_id" uuid,
        "tax_office" character varying(100),
        "tax_number" character varying(20),
        "national_id" character varying(11),
        "birth_date" date,
        "serial_number" character varying(50),
        "city_id" smallint,
        "district_id" integer,
        "address" text,
        "phone" character varying(20),
        "mobile" character varying(20),
        "email" character varying(255),
        "show_announcement" boolean NOT NULL DEFAULT true,
        "documents_completed" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_companies" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_companies_company_code" UNIQUE ("company_code"),
        CONSTRAINT "FK_companies_parent" FOREIGN KEY ("parent_company_id") REFERENCES "companies"("id"),
        CONSTRAINT "FK_companies_dealer" FOREIGN KEY ("dealer_company_id") REFERENCES "companies"("id"),
        CONSTRAINT "FK_companies_city" FOREIGN KEY ("city_id") REFERENCES "cities"("id"),
        CONSTRAINT "FK_companies_district" FOREIGN KEY ("district_id") REFERENCES "districts"("id")
      );

      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid,
        "company_code" character varying NOT NULL,
        "username" character varying NOT NULL,
        "password_hash" character varying NOT NULL,
        "role" "users_role_enum" NOT NULL DEFAULT 'CUSTOMER',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "FK_users_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id")
      );

      CREATE TABLE "company_contacts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "name" character varying(200) NOT NULL,
        "contact_type" "company_contacts_contact_type_enum" NOT NULL,
        "mobile" character varying(20),
        "phone" character varying(20),
        "email" character varying(255),
        "description" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_company_contacts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_company_contacts_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      );

      CREATE TABLE "company_notes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "note" text NOT NULL,
        "show_on_open" boolean NOT NULL DEFAULT false,
        "created_by" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_company_notes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_company_notes_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      );

      CREATE TABLE "company_security_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "ip_rule_type" "company_security_settings_ip_rule_type_enum" NOT NULL DEFAULT 'NO_CONTROL',
        "file_password_encrypted" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_company_security_settings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_company_security_settings_company" UNIQUE ("company_id"),
        CONSTRAINT "FK_company_security_settings_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      );

      CREATE TABLE "company_ip_rules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "ip_address" character varying(50) NOT NULL,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_company_ip_rules" PRIMARY KEY ("id"),
        CONSTRAINT "FK_company_ip_rules_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      );

      CREATE TABLE "company_sms_accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "provider_id" uuid NOT NULL,
        "username" character varying(100),
        "subscriber_no" character varying(50),
        "credit_refund_rate" numeric(5,2),
        "single_send_limit" integer,
        "apply_to_sub_accounts" boolean NOT NULL DEFAULT false,
        "no_routing" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_company_sms_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_company_sms_accounts_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_company_sms_accounts_provider" FOREIGN KEY ("provider_id") REFERENCES "sms_providers"("id")
      );

      CREATE TABLE "company_originators" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "sms_account_id" uuid,
        "name" character varying(11) NOT NULL,
        "status" "company_originators_status_enum" NOT NULL DEFAULT 'PENDING',
        "provider_reference" character varying(100),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_company_originators" PRIMARY KEY ("id"),
        CONSTRAINT "FK_company_originators_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_company_originators_sms_account" FOREIGN KEY ("sms_account_id") REFERENCES "company_sms_accounts"("id")
      );

      CREATE TABLE "company_credit_alerts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "threshold" integer NOT NULL,
        "message" text NOT NULL,
        "notification_type" "company_credit_alerts_notification_type_enum" NOT NULL DEFAULT 'EMAIL',
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_company_credit_alerts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_company_credit_alerts_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      );

      CREATE TABLE "company_services" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "service_id" uuid NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "start_date" date,
        "end_date" date,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_company_services" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_company_services_company_service" UNIQUE ("company_id", "service_id"),
        CONSTRAINT "FK_company_services_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_company_services_service" FOREIGN KEY ("service_id") REFERENCES "services"("id")
      );

      CREATE TABLE "company_service_keywords" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "originator_id" uuid,
        "title" character varying(100) NOT NULL,
        "keyword" character varying(50) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_company_service_keywords" PRIMARY KEY ("id"),
        CONSTRAINT "FK_company_service_keywords_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_company_service_keywords_originator" FOREIGN KEY ("originator_id") REFERENCES "company_originators"("id")
      );

      CREATE TABLE "price_lists" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(200) NOT NULL,
        "list_type" "price_lists_list_type_enum" NOT NULL,
        "owner_company_id" uuid,
        "currency" character varying(3) NOT NULL DEFAULT 'TRY',
        "valid_from" date,
        "valid_to" date,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by" uuid,
        CONSTRAINT "PK_price_lists" PRIMARY KEY ("id"),
        CONSTRAINT "FK_price_lists_owner_company" FOREIGN KEY ("owner_company_id") REFERENCES "companies"("id")
      );

      CREATE TABLE "price_list_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "price_list_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "unit_price" numeric(12,4) NOT NULL,
        CONSTRAINT "PK_price_list_items" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_price_list_items_list_product" UNIQUE ("price_list_id", "product_id"),
        CONSTRAINT "FK_price_list_items_price_list" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_price_list_items_product" FOREIGN KEY ("product_id") REFERENCES "products"("id")
      );

      CREATE TABLE "company_price_lists" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "price_list_id" uuid NOT NULL,
        "assigned_by" uuid,
        "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_company_price_lists" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_company_price_lists_company_list" UNIQUE ("company_id", "price_list_id"),
        CONSTRAINT "FK_company_price_lists_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_company_price_lists_price_list" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id")
      );

      CREATE TABLE "company_custom_prices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "unit_price" numeric(12,4) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'TRY',
        "valid_from" date,
        "valid_to" date,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_company_custom_prices" PRIMARY KEY ("id"),
        CONSTRAINT "FK_company_custom_prices_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_company_custom_prices_product" FOREIGN KEY ("product_id") REFERENCES "products"("id")
      );

      CREATE TABLE "company_iys_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "iys_code" character varying(50),
        "brand_code" character varying(50),
        "status" "company_iys_settings_status_enum" NOT NULL DEFAULT 'PASSIVE',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_company_iys_settings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_company_iys_settings_company" UNIQUE ("company_id"),
        CONSTRAINT "FK_company_iys_settings_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      );

      CREATE TABLE "wallets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "wallet_type" "wallets_wallet_type_enum" NOT NULL,
        "balance" numeric(14,4) NOT NULL DEFAULT 0,
        CONSTRAINT "PK_wallets" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_wallets_company_type" UNIQUE ("company_id", "wallet_type"),
        CONSTRAINT "FK_wallets_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      );

      CREATE TABLE "wallet_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "wallet_id" uuid NOT NULL,
        "transaction_type" "wallet_transactions_transaction_type_enum" NOT NULL,
        "amount" numeric(14,4) NOT NULL,
        "balance_before" numeric(14,4) NOT NULL,
        "balance_after" numeric(14,4) NOT NULL,
        "description" text,
        "reference_type" character varying(50),
        "reference_id" uuid,
        "created_by" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wallet_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_wallet_transactions_wallet" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE
      );

      CREATE TABLE "company_credentials" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "credential_type" "company_credentials_credential_type_enum" NOT NULL,
        "entity_type" character varying(100) NOT NULL,
        "entity_id" uuid NOT NULL,
        "encrypted_value" text NOT NULL,
        "key_version" integer NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_company_credentials" PRIMARY KEY ("id"),
        CONSTRAINT "FK_company_credentials_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      );

      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "actor_user_id" uuid,
        "company_id" uuid,
        "action" character varying(100) NOT NULL,
        "entity_type" character varying(100) NOT NULL,
        "entity_id" uuid,
        "old_values" jsonb,
        "new_values" jsonb,
        "ip_address" inet,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audit_logs_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id")
      );

      CREATE INDEX "IDX_audit_logs_company_created" ON "audit_logs" ("company_id", "created_at");
      CREATE INDEX "IDX_audit_logs_entity" ON "audit_logs" ("entity_type", "entity_id");
    `);

    const cityValues = TURKISH_CITIES.map(
      ([id, name, plateCode]) => `(${id}, '${name.replace(/'/g, "''")}', '${plateCode}')`,
    ).join(',\n');

    await queryRunner.query(`
      INSERT INTO "cities" ("id", "name", "plate_code") VALUES
      ${cityValues};
    `);

    await queryRunner.query(`
      INSERT INTO "sms_providers" ("id", "code", "name", "is_active", "config_schema") VALUES
      ('a0000001-0000-4000-8000-000000000001', 'KOCAELI', 'Kocaeli SMS', true, '{"fields":["username","password","subscriberNo"]}'),
      ('a0000001-0000-4000-8000-000000000002', 'BIR_TELEKOM', 'Bir Telekom', true, '{"fields":["username","password","apiKey"]}'),
      ('a0000001-0000-4000-8000-000000000003', 'VOICE_TELEKOM', 'VoiceTelekom', true, '{"fields":["username","password","subscriberNo","apiKey"]}');

      INSERT INTO "services" ("id", "code", "name", "description", "is_active") VALUES
      ('b0000001-0000-4000-8000-000000000001', 'KVKK', 'KVKK Servisi', 'KVKK uyumluluk servisi', true),
      ('b0000001-0000-4000-8000-000000000002', 'SURVEY', 'Anket Servisi', 'SMS anket servisi', true),
      ('b0000001-0000-4000-8000-000000000003', 'RET', 'RET Servisi', 'Ret bildirim servisi', true),
      ('b0000001-0000-4000-8000-000000000004', 'IYS', 'İYS Servisi', 'İleti Yönetim Sistemi entegrasyonu', true),
      ('b0000001-0000-4000-8000-000000000005', 'AI', 'AI Servisi', 'Yapay zeka destekli SMS servisi', true);

      INSERT INTO "products" ("id", "code", "name", "credit_amount", "product_type", "is_active") VALUES
      ('c0000001-0000-4000-8000-000000000001', 'SMS_5000', '5.000 SMS Kredisi', 5000, 'SMS', true),
      ('c0000001-0000-4000-8000-000000000002', 'SMS_10000', '10.000 SMS Kredisi', 10000, 'SMS', true),
      ('c0000001-0000-4000-8000-000000000003', 'SMS_25000', '25.000 SMS Kredisi', 25000, 'SMS', true),
      ('c0000001-0000-4000-8000-000000000004', 'SMS_50000', '50.000 SMS Kredisi', 50000, 'SMS', true),
      ('c0000001-0000-4000-8000-000000000005', 'SMS_100000', '100.000 SMS Kredisi', 100000, 'SMS', true),
      ('c0000001-0000-4000-8000-000000000006', 'SMS_250000', '250.000 SMS Kredisi', 250000, 'SMS', true),
      ('c0000001-0000-4000-8000-000000000007', 'SMS_500000', '500.000 SMS Kredisi', 500000, 'SMS', true);

      INSERT INTO "price_lists" ("id", "name", "list_type", "currency", "is_active") VALUES
      ('d0000001-0000-4000-8000-000000000001', 'Platform Standart Fiyat Listesi', 'PLATFORM', 'TRY', true);

      INSERT INTO "price_list_items" ("price_list_id", "product_id", "unit_price") VALUES
      ('d0000001-0000-4000-8000-000000000001', 'c0000001-0000-4000-8000-000000000001', 500.0000),
      ('d0000001-0000-4000-8000-000000000001', 'c0000001-0000-4000-8000-000000000002', 900.0000),
      ('d0000001-0000-4000-8000-000000000001', 'c0000001-0000-4000-8000-000000000003', 2000.0000),
      ('d0000001-0000-4000-8000-000000000001', 'c0000001-0000-4000-8000-000000000004', 3500.0000),
      ('d0000001-0000-4000-8000-000000000001', 'c0000001-0000-4000-8000-000000000005', 6000.0000),
      ('d0000001-0000-4000-8000-000000000001', 'c0000001-0000-4000-8000-000000000006', 12000.0000),
      ('d0000001-0000-4000-8000-000000000001', 'c0000001-0000-4000-8000-000000000007', 20000.0000);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "audit_logs";
      DROP TABLE IF EXISTS "company_credentials";
      DROP TABLE IF EXISTS "wallet_transactions";
      DROP TABLE IF EXISTS "wallets";
      DROP TABLE IF EXISTS "company_iys_settings";
      DROP TABLE IF EXISTS "company_custom_prices";
      DROP TABLE IF EXISTS "company_price_lists";
      DROP TABLE IF EXISTS "price_list_items";
      DROP TABLE IF EXISTS "price_lists";
      DROP TABLE IF EXISTS "company_service_keywords";
      DROP TABLE IF EXISTS "company_services";
      DROP TABLE IF EXISTS "company_credit_alerts";
      DROP TABLE IF EXISTS "company_originators";
      DROP TABLE IF EXISTS "company_sms_accounts";
      DROP TABLE IF EXISTS "company_ip_rules";
      DROP TABLE IF EXISTS "company_security_settings";
      DROP TABLE IF EXISTS "company_notes";
      DROP TABLE IF EXISTS "company_contacts";
      DROP TABLE IF EXISTS "users";
      DROP TABLE IF EXISTS "companies";
      DROP TABLE IF EXISTS "products";
      DROP TABLE IF EXISTS "services";
      DROP TABLE IF EXISTS "sms_providers";
      DROP TABLE IF EXISTS "districts";
      DROP TABLE IF EXISTS "cities";

      DROP TYPE IF EXISTS "company_credentials_credential_type_enum";
      DROP TYPE IF EXISTS "wallet_transactions_transaction_type_enum";
      DROP TYPE IF EXISTS "wallets_wallet_type_enum";
      DROP TYPE IF EXISTS "price_lists_list_type_enum";
      DROP TYPE IF EXISTS "products_product_type_enum";
      DROP TYPE IF EXISTS "company_credit_alerts_notification_type_enum";
      DROP TYPE IF EXISTS "company_security_settings_ip_rule_type_enum";
      DROP TYPE IF EXISTS "company_iys_settings_status_enum";
      DROP TYPE IF EXISTS "company_originators_status_enum";
      DROP TYPE IF EXISTS "company_contacts_contact_type_enum";
      DROP TYPE IF EXISTS "users_role_enum";
      DROP TYPE IF EXISTS "companies_status_enum";
      DROP TYPE IF EXISTS "companies_company_type_enum";
    `);
  }
}
