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
import { MessagingModule } from './modules/messaging/messaging.module.js';
import { DocumentsModule } from './modules/documents/documents.module.js';
import { ContactsModule } from './modules/contacts/contacts.module.js';
import { KvkkModule } from './modules/kvkk/kvkk.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { OriginatorRestrictionsModule } from './modules/originator-restrictions/originator-restrictions.module.js';
import { InboxModule } from './modules/inbox/inbox.module.js';
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
import { CompanyServiceTerm } from './modules/companies/entities/company-service-term.entity.js';
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
import { SmsCampaign } from './modules/messaging/entities/sms-campaign.entity.js';
import { SmsCampaignSegment } from './modules/messaging/entities/sms-campaign-segment.entity.js';
import { SmsCampaignRecipient } from './modules/messaging/entities/sms-campaign-recipient.entity.js';
import { DocumentType } from './modules/documents/entities/document-type.entity.js';
import { DocumentTypeAssignment } from './modules/documents/entities/document-type-assignment.entity.js';
import { CompanyDocument } from './modules/documents/entities/company-document.entity.js';
import { CompanyDocumentProcess } from './modules/documents/entities/company-document-process.entity.js';
import { Contact } from './modules/contacts/entities/contact.entity.js';
import { ContactGroup } from './modules/contacts/entities/contact-group.entity.js';
import { ContactGroupMember } from './modules/contacts/entities/contact-group-member.entity.js';
import { ContactTag } from './modules/contacts/entities/contact-tag.entity.js';
import { ContactTagMember } from './modules/contacts/entities/contact-tag-member.entity.js';
import { ContactImportJob } from './modules/contacts/entities/contact-import-job.entity.js';
import { ContactImportError } from './modules/contacts/entities/contact-import-error.entity.js';
import { NotificationDispatch } from './modules/notifications/entities/notification-dispatch.entity.js';
import { OriginatorBlockedNumber } from './modules/originator-restrictions/entities/originator-blocked-number.entity.js';
import { InboxNotification } from './modules/inbox/entities/inbox-notification.entity.js';

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
  CompanyServiceTerm,
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
  SmsCampaign,
  SmsCampaignSegment,
  SmsCampaignRecipient,
  DocumentType,
  DocumentTypeAssignment,
  CompanyDocument,
  CompanyDocumentProcess,
  Contact,
  ContactGroup,
  ContactGroupMember,
  ContactTag,
  ContactTagMember,
  ContactImportJob,
  ContactImportError,
  NotificationDispatch,
  OriginatorBlockedNumber,
  InboxNotification,
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
    MessagingModule,
    DocumentsModule,
    ContactsModule,
    KvkkModule,
    NotificationsModule,
    OriginatorRestrictionsModule,
    InboxModule,
  ],
})
export class AppModule {}
