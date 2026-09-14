import { MigrationInterface, QueryRunner } from 'typeorm';

const CATEGORIES: Array<{
  code: string;
  name: string;
  children: Array<{ code: string; name: string }>;
}> = [
  {
    code: 'HEALTH',
    name: 'Sağlık',
    children: [
      { code: 'PHARMACY', name: 'Eczane' },
      { code: 'HOSPITAL', name: 'Hastane' },
      { code: 'PRIVATE_HOSPITAL', name: 'Özel Hastane' },
      { code: 'MEDICAL_CENTER', name: 'Tıp Merkezi' },
      { code: 'POLICLINIC', name: 'Poliklinik' },
      { code: 'DENTAL_CLINIC', name: 'Diş Kliniği' },
      { code: 'VET_CLINIC', name: 'Veteriner Kliniği' },
      { code: 'OPTICS', name: 'Optik' },
      { code: 'LABORATORY', name: 'Laboratuvar' },
    ],
  },
  {
    code: 'CHAMBERS',
    name: 'Oda / Meslek Kuruluşları',
    children: [
      { code: 'PHARMACIST_CHAMBER', name: 'Eczacı Odası' },
      { code: 'CHAMBER_OF_COMMERCE', name: 'Ticaret Odası' },
      { code: 'CHAMBER_OF_INDUSTRY', name: 'Sanayi Odası' },
      { code: 'TRADESMEN_CHAMBER', name: 'Esnaf Odası' },
      { code: 'MEDICAL_CHAMBER', name: 'Tabip Odası' },
      { code: 'ENGINEERS_CHAMBER', name: 'Mühendis Odası' },
      { code: 'ARCHITECTS_CHAMBER', name: 'Mimarlar Odası' },
      { code: 'BAR_ASSOCIATION', name: 'Baro' },
      { code: 'OTHER_CHAMBERS', name: 'Diğer Meslek Odaları' },
    ],
  },
  {
    code: 'NGO',
    name: 'Dernek / Vakıf / STK',
    children: [
      { code: 'ASSOCIATION', name: 'Dernek' },
      { code: 'FOUNDATION', name: 'Vakıf' },
      { code: 'FEDERATION', name: 'Federasyon' },
      { code: 'CONFEDERATION', name: 'Konfederasyon' },
      { code: 'COOPERATIVE', name: 'Kooperatif' },
      { code: 'CIVIL_SOCIETY', name: 'Sivil Toplum Kuruluşu' },
    ],
  },
  {
    code: 'PUBLIC',
    name: 'Kamu',
    children: [
      { code: 'MUNICIPALITY', name: 'Belediye' },
      { code: 'MINISTRY', name: 'Bakanlık' },
      { code: 'PUBLIC_INSTITUTION', name: 'Kamu Kurumu' },
      { code: 'PROVINCIAL_DIRECTORATE', name: 'İl Müdürlüğü' },
      { code: 'DISTRICT_GOVERNORATE', name: 'Kaymakamlık' },
      { code: 'GOVERNORATE', name: 'Valilik' },
      { code: 'PUBLIC_ENTERPRISE', name: 'Kamu İştiraki' },
    ],
  },
  {
    code: 'EDUCATION',
    name: 'Eğitim',
    children: [
      { code: 'UNIVERSITY', name: 'Üniversite' },
      { code: 'PRIVATE_SCHOOL', name: 'Özel Okul' },
      { code: 'COLLEGE', name: 'Kolej' },
      { code: 'COURSE_CENTER', name: 'Kurs Merkezi' },
      { code: 'LANGUAGE_SCHOOL', name: 'Dil Okulu' },
      { code: 'STUDY_CENTER', name: 'Etüt Merkezi' },
      { code: 'NURSERY', name: 'Kreş' },
      { code: 'KINDERGARTEN', name: 'Anaokulu' },
      { code: 'EDUCATION_PLATFORM', name: 'Eğitim Platformu' },
    ],
  },
  {
    code: 'RETAIL',
    name: 'Perakende',
    children: [
      { code: 'MARKET', name: 'Market' },
      { code: 'SUPERMARKET', name: 'Süpermarket' },
      { code: 'STORE', name: 'Mağaza' },
      { code: 'CHAIN_STORE', name: 'Zincir Mağaza' },
      { code: 'CLOTHING_STORE', name: 'Giyim Mağazası' },
      { code: 'ELECTRONICS_STORE', name: 'Elektronik Mağazası' },
      { code: 'FURNITURE_STORE', name: 'Mobilya Mağazası' },
    ],
  },
  {
    code: 'ECOMMERCE',
    name: 'E-Ticaret',
    children: [
      { code: 'ECOMMERCE_SITE', name: 'E-Ticaret Sitesi' },
      { code: 'MARKETPLACE_SELLER', name: 'Pazaryeri Satıcısı' },
      { code: 'ONLINE_STORE', name: 'Online Mağaza' },
      { code: 'SUBSCRIPTION_PLATFORM', name: 'Abonelik Platformu' },
    ],
  },
  {
    code: 'FOOD',
    name: 'Gıda / Yeme-İçme',
    children: [
      { code: 'RESTAURANT', name: 'Restoran' },
      { code: 'CAFE', name: 'Kafe' },
      { code: 'PATISSERIE', name: 'Pastane' },
      { code: 'BAKERY', name: 'Fırın' },
      { code: 'CATERING', name: 'Catering Firması' },
      { code: 'FOOD_PRODUCER', name: 'Gıda Üreticisi' },
      { code: 'FOOD_WHOLESALER', name: 'Gıda Toptancısı' },
    ],
  },
  {
    code: 'TOURISM',
    name: 'Turizm / Konaklama',
    children: [
      { code: 'HOTEL', name: 'Otel' },
      { code: 'PENSION', name: 'Pansiyon' },
      { code: 'RESORT', name: 'Tatil Köyü' },
      { code: 'TRAVEL_AGENCY', name: 'Turizm Acentesi' },
      { code: 'TOUR_OPERATOR', name: 'Tur Operatörü' },
      { code: 'EVENT_VENUE', name: 'Organizasyon Tesisi' },
    ],
  },
  {
    code: 'AUTOMOTIVE',
    name: 'Otomotiv',
    children: [
      { code: 'AUTO_DEALER', name: 'Otomotiv Bayisi' },
      { code: 'AUTHORIZED_SERVICE', name: 'Yetkili Servis' },
      { code: 'INDEPENDENT_SERVICE', name: 'Özel Servis' },
      { code: 'CAR_RENTAL', name: 'Araç Kiralama' },
      { code: 'AUTO_EXPERTISE', name: 'Oto Ekspertiz' },
      { code: 'AUTO_PARTS', name: 'Oto Yedek Parça' },
    ],
  },
  {
    code: 'FINANCE',
    name: 'Finans / Sigorta',
    children: [
      { code: 'BANK', name: 'Banka' },
      { code: 'FINANCE_INSTITUTION', name: 'Finans Kuruluşu' },
      { code: 'PAYMENT_INSTITUTION', name: 'Ödeme Kuruluşu' },
      { code: 'INSURANCE_COMPANY', name: 'Sigorta Şirketi' },
      { code: 'INSURANCE_AGENCY', name: 'Sigorta Acentesi' },
      { code: 'FINANCIAL_CONSULTING', name: 'Finansal Danışmanlık' },
    ],
  },
  {
    code: 'REAL_ESTATE',
    name: 'Gayrimenkul / İnşaat',
    children: [
      { code: 'CONSTRUCTION', name: 'İnşaat Firması' },
      { code: 'CONTRACTOR', name: 'Müteahhit' },
      { code: 'REAL_ESTATE_FIRM', name: 'Gayrimenkul Firması' },
      { code: 'REAL_ESTATE_OFFICE', name: 'Emlak Ofisi' },
      { code: 'PROJECT_MANAGEMENT', name: 'Proje Yönetimi' },
      { code: 'HOUSING_COOPERATIVE', name: 'Yapı Kooperatifi' },
    ],
  },
  {
    code: 'FACILITY',
    name: 'Site / Tesis Yönetimi',
    children: [
      { code: 'SITE_MANAGEMENT', name: 'Site Yönetimi' },
      { code: 'APARTMENT_MANAGEMENT', name: 'Apartman Yönetimi' },
      { code: 'RESIDENCE_MANAGEMENT', name: 'Rezidans Yönetimi' },
      { code: 'MALL_MANAGEMENT', name: 'AVM Yönetimi' },
      { code: 'OFFICE_CENTER_MANAGEMENT', name: 'İş Merkezi Yönetimi' },
      { code: 'FACILITY_FIRM', name: 'Tesis Yönetim Firması' },
    ],
  },
  {
    code: 'TECHNOLOGY',
    name: 'Teknoloji / Yazılım',
    children: [
      { code: 'SOFTWARE', name: 'Yazılım Firması' },
      { code: 'SAAS', name: 'SaaS Firması' },
      { code: 'TECH_FIRM', name: 'Teknoloji Firması' },
      { code: 'TELECOM', name: 'Telekom Firması' },
      { code: 'HOSTING', name: 'Hosting Firması' },
      { code: 'IT_SERVICES', name: 'BT Hizmet Firması' },
    ],
  },
  {
    code: 'INDUSTRY',
    name: 'Sanayi / Üretim',
    children: [
      { code: 'FACTORY', name: 'Fabrika' },
      { code: 'MANUFACTURER', name: 'Üretici' },
      { code: 'ORGANIZED_INDUSTRY', name: 'Organize Sanayi Firması' },
      { code: 'MACHINERY', name: 'Makine Üreticisi' },
      { code: 'CHEMICAL', name: 'Kimya Firması' },
      { code: 'METAL', name: 'Metal Firması' },
      { code: 'PLASTIC', name: 'Plastik Firması' },
    ],
  },
  {
    code: 'TEXTILE',
    name: 'Tekstil / Moda',
    children: [
      { code: 'TEXTILE_PRODUCER', name: 'Tekstil Üreticisi' },
      { code: 'READY_WEAR', name: 'Hazır Giyim' },
      { code: 'APPAREL_STORE', name: 'Giyim Mağazası' },
      { code: 'FOOTWEAR', name: 'Ayakkabı' },
      { code: 'ACCESSORIES', name: 'Aksesuar' },
      { code: 'TEXTILE_WHOLESALER', name: 'Tekstil Toptancısı' },
    ],
  },
  {
    code: 'LOGISTICS',
    name: 'Lojistik / Taşımacılık',
    children: [
      { code: 'CARGO', name: 'Kargo Firması' },
      { code: 'LOGISTICS_FIRM', name: 'Lojistik Firması' },
      { code: 'FREIGHT', name: 'Nakliye Firması' },
      { code: 'COURIER', name: 'Kurye Firması' },
      { code: 'WAREHOUSING', name: 'Depolama Firması' },
      { code: 'DISTRIBUTION', name: 'Dağıtım Firması' },
    ],
  },
  {
    code: 'PROFESSIONAL',
    name: 'Profesyonel Hizmetler',
    children: [
      { code: 'ACCOUNTING', name: 'Muhasebe Bürosu' },
      { code: 'CPA', name: 'Mali Müşavir' },
      { code: 'LAW_FIRM', name: 'Hukuk Bürosu' },
      { code: 'CONSULTING', name: 'Danışmanlık Firması' },
      { code: 'HR_FIRM', name: 'İnsan Kaynakları Firması' },
      { code: 'CALL_CENTER', name: 'Çağrı Merkezi' },
    ],
  },
  {
    code: 'BEAUTY',
    name: 'Güzellik / Kişisel Bakım',
    children: [
      { code: 'HAIRDRESSER', name: 'Kuaför' },
      { code: 'BARBER', name: 'Berber' },
      { code: 'BEAUTY_CENTER', name: 'Güzellik Merkezi' },
      { code: 'SPA', name: 'SPA' },
      { code: 'AESTHETIC_CENTER', name: 'Estetik Merkezi' },
      { code: 'COSMETICS', name: 'Kozmetik Firması' },
    ],
  },
  {
    code: 'SPORTS',
    name: 'Spor / Fitness',
    children: [
      { code: 'GYM', name: 'Spor Salonu' },
      { code: 'FITNESS_CENTER', name: 'Fitness Merkezi' },
      { code: 'SPORTS_CLUB', name: 'Spor Kulübü' },
      { code: 'TURF_FIELD', name: 'Halı Saha' },
      { code: 'SPORTS_ACADEMY', name: 'Spor Akademisi' },
    ],
  },
  {
    code: 'AGRICULTURE',
    name: 'Tarım / Hayvancılık',
    children: [
      { code: 'AGRI_FIRM', name: 'Tarım Firması' },
      { code: 'FARM', name: 'Çiftlik' },
      { code: 'LIVESTOCK', name: 'Hayvancılık Firması' },
      { code: 'AGRI_COOPERATIVE', name: 'Tarım Kooperatifi' },
      { code: 'FEED_FIRM', name: 'Yem Firması' },
    ],
  },
  {
    code: 'ENERGY',
    name: 'Enerji',
    children: [
      { code: 'ELECTRICITY', name: 'Elektrik Firması' },
      { code: 'NATURAL_GAS', name: 'Doğalgaz Firması' },
      { code: 'ENERGY_FIRM', name: 'Enerji Firması' },
      { code: 'RENEWABLE', name: 'Yenilenebilir Enerji' },
      { code: 'FUEL', name: 'Akaryakıt Firması' },
    ],
  },
  {
    code: 'MEDIA',
    name: 'Medya / Reklam',
    children: [
      { code: 'AD_AGENCY', name: 'Reklam Ajansı' },
      { code: 'DIGITAL_AGENCY', name: 'Dijital Ajans' },
      { code: 'MEDIA_FIRM', name: 'Medya Firması' },
      { code: 'PRINTING', name: 'Matbaa' },
      { code: 'EVENT_FIRM', name: 'Organizasyon Firması' },
    ],
  },
  {
    code: 'DEALER',
    name: 'Bayi / Franchise',
    children: [
      { code: 'DEALER', name: 'Bayi' },
      { code: 'DISTRIBUTOR', name: 'Distribütör' },
      { code: 'FRANCHISE', name: 'Franchise' },
      { code: 'REGIONAL_DEALER', name: 'Bölge Bayisi' },
      { code: 'AUTHORIZED_SELLER', name: 'Yetkili Satıcı' },
    ],
  },
  {
    code: 'POLITICAL',
    name: 'Siyasi / Sendikal',
    children: [
      { code: 'POLITICAL_PARTY', name: 'Siyasi Parti' },
      { code: 'PARTY_BRANCH', name: 'İl / İlçe Teşkilatı' },
      { code: 'UNION', name: 'Sendika' },
      { code: 'PROFESSIONAL_UNION', name: 'Meslek Sendikası' },
    ],
  },
  {
    code: 'OTHER',
    name: 'Diğer',
    children: [
      { code: 'SOLE_PROPRIETOR', name: 'Şahıs Firması' },
      { code: 'FREELANCE', name: 'Serbest Meslek' },
      { code: 'INDIVIDUAL_BUSINESS', name: 'Bireysel İşletme' },
      { code: 'OTHER', name: 'Diğer' },
    ],
  },
];

export class CustomerCategories1730000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "companies_customer_type_enum" AS ENUM (
        'PRIVATE_SECTOR',
        'PUBLIC',
        'NGO_CHAMBER',
        'DEALER_PARTNER',
        'INDIVIDUAL_BUSINESS'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "customer_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying(50) NOT NULL,
        "name" character varying(150) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_customer_categories" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_customer_categories_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "customer_subcategories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "category_id" uuid NOT NULL,
        "code" character varying(50) NOT NULL,
        "name" character varying(150) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_customer_subcategories" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_customer_subcategories_category_code" UNIQUE ("category_id", "code"),
        CONSTRAINT "FK_customer_subcategories_category"
          FOREIGN KEY ("category_id") REFERENCES "customer_categories"("id") ON DELETE RESTRICT
      )
    `);

    for (const [index, category] of CATEGORIES.entries()) {
      await queryRunner.query(
        `
        INSERT INTO "customer_categories" ("code", "name", "is_active", "sort_order")
        VALUES ($1, $2, true, $3)
        `,
        [category.code, category.name, (index + 1) * 10],
      );

      for (const [childIndex, child] of category.children.entries()) {
        await queryRunner.query(
          `
          INSERT INTO "customer_subcategories" ("category_id", "code", "name", "is_active", "sort_order")
          SELECT c.id, $1, $2, true, $3
          FROM "customer_categories" c
          WHERE c.code = $4
          `,
          [child.code, child.name, (childIndex + 1) * 10, category.code],
        );
      }
    }

    await queryRunner.query(`
      ALTER TABLE "companies"
      ADD COLUMN "customer_type" "companies_customer_type_enum",
      ADD COLUMN "category_id" uuid,
      ADD COLUMN "subcategory_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "companies"
      ADD CONSTRAINT "FK_companies_customer_category"
        FOREIGN KEY ("category_id") REFERENCES "customer_categories"("id") ON DELETE SET NULL,
      ADD CONSTRAINT "FK_companies_customer_subcategory"
        FOREIGN KEY ("subcategory_id") REFERENCES "customer_subcategories"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies"
      DROP CONSTRAINT IF EXISTS "FK_companies_customer_subcategory",
      DROP CONSTRAINT IF EXISTS "FK_companies_customer_category"
    `);
    await queryRunner.query(`
      ALTER TABLE "companies"
      DROP COLUMN IF EXISTS "subcategory_id",
      DROP COLUMN IF EXISTS "category_id",
      DROP COLUMN IF EXISTS "customer_type"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_subcategories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_categories"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "companies_customer_type_enum"`);
  }
}
