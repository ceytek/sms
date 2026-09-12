import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity.js';
import { CompanyContact } from './entities/company-contact.entity.js';
import { CompanyNote } from './entities/company-note.entity.js';
import { CompanySecuritySettings } from './entities/company-security-settings.entity.js';
import { CompanyIpRule } from './entities/company-ip-rule.entity.js';
import { CompanySmsAccount } from './entities/company-sms-account.entity.js';
import { CompanyOriginator } from './entities/company-originator.entity.js';
import { CompanyCreditAlert } from './entities/company-credit-alert.entity.js';
import { CompanyService } from './entities/company-service.entity.js';
import { CompanyIysSettings } from './entities/company-iys-settings.entity.js';
import { CompanyPriceList } from './entities/company-price-list.entity.js';
import { Wallet } from '../wallets/entities/wallet.entity.js';
import { User } from '../auth/entities/user.entity.js';
import { CompaniesController } from './companies.controller.js';
import { CompaniesService } from './companies.service.js';
import { CredentialsModule } from '../credentials/credentials.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Company,
      CompanyContact,
      CompanyNote,
      CompanySecuritySettings,
      CompanyIpRule,
      CompanySmsAccount,
      CompanyOriginator,
      CompanyCreditAlert,
      CompanyService,
      CompanyIysSettings,
      CompanyPriceList,
      Wallet,
      User,
    ]),
    CredentialsModule,
    AuditModule,
    AuthModule,
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
