import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './config/database.config.js';
import jwtConfig from './config/jwt.config.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CompaniesModule } from './modules/companies/companies.module.js';
import { ReferenceModule } from './modules/reference/reference.module.js';
import { CredentialsModule } from './modules/credentials/credentials.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { PricingModule } from './modules/pricing/pricing.module.js';
import { AdsModule } from './modules/ads/ads.module.js';
import { MapModule } from './modules/map/map.module.js';
import { OriginatorsModule } from './modules/originators/originators.module.js';
import { CreditsModule } from './modules/credits/credits.module.js';
import { User } from './modules/auth/entities/user.entity.js';
import { Company } from './modules/companies/entities/company.entity.js';
import { CompanyContact } from './modules/companies/entities/company-contact.entity.js';
import { CompanyNote } from './modules/companies/entities/company-note.entity.js';
import { CompanySecuritySettings } from './modules/companies/entities/company-security-settings.entity.js';
import { CompanyIpRule } from './modules/companies/entities/company-ip-rule.entity.js';
import { CompanySmsAccount } from './modules/companies/entities/company-sms-account.entity.js';
import { CompanyOriginator } from './modules/companies/entities/company-originator.entity.js';
import { CompanyCreditAlert } from './modules/companies/entities/company-credit-alert.entity.js';
import { CompanyService } from './modules/companies/entities/company-service.entity.js';
import { CompanyServiceKeyword } from './modules/companies/entities/company-service-keyword.entity.js';
import { CompanyIysSettings } from './modules/companies/entities/company-iys-settings.entity.js';
import { CompanyCustomPrice } from './modules/companies/entities/company-custom-price.entity.js';
import { CompanyPriceList } from './modules/companies/entities/company-price-list.entity.js';
import { City } from './modules/reference/entities/city.entity.js';
import { District } from './modules/reference/entities/district.entity.js';
import { SmsProvider } from './modules/reference/entities/sms-provider.entity.js';
import { Service } from './modules/reference/entities/service.entity.js';
import { Product } from './modules/reference/entities/product.entity.js';
import { CustomerCategory } from './modules/reference/entities/customer-category.entity.js';
import { CustomerSubcategory } from './modules/reference/entities/customer-subcategory.entity.js';
import { PriceList } from './modules/pricing/entities/price-list.entity.js';
import { PriceListItem } from './modules/pricing/entities/price-list-item.entity.js';
import { Wallet } from './modules/wallets/entities/wallet.entity.js';
import { WalletTransaction } from './modules/wallets/entities/wallet-transaction.entity.js';
import { CompanyCredential } from './modules/credentials/entities/company-credential.entity.js';
import { AuditLog } from './modules/audit/entities/audit-log.entity.js';
import { BannedOriginator } from './modules/originators/entities/banned-originator.entity.js';

const entities = [
  User,
  Company,
  CompanyContact,
  CompanyNote,
  CompanySecuritySettings,
  CompanyIpRule,
  CompanySmsAccount,
  CompanyOriginator,
  CompanyCreditAlert,
  CompanyService,
  CompanyServiceKeyword,
  CompanyIysSettings,
  CompanyCustomPrice,
  CompanyPriceList,
  City,
  District,
  SmsProvider,
  Service,
  Product,
  CustomerCategory,
  CustomerSubcategory,
  PriceList,
  PriceListItem,
  Wallet,
  WalletTransaction,
  CompanyCredential,
  AuditLog,
  BannedOriginator,
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        entities,
        autoLoadEntities: true,
        synchronize: false,
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: process.env.NODE_ENV === 'production',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    CompaniesModule,
    ReferenceModule,
    CredentialsModule,
    AuditModule,
    PricingModule,
    AdsModule,
    MapModule,
    OriginatorsModule,
    CreditsModule,
  ],
})
export class AppModule {}
