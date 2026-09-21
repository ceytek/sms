import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { CompanyOriginator } from '../companies/entities/company-originator.entity.js';
import { CompanySmsAccount } from '../companies/entities/company-sms-account.entity.js';
import { SmsProvider } from '../reference/entities/sms-provider.entity.js';
import { OriginatorBlockedNumber } from './entities/originator-blocked-number.entity.js';
import { OriginatorRestrictionsController } from './originator-restrictions.controller.js';
import { OriginatorRestrictionsService } from './originator-restrictions.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([OriginatorBlockedNumber, CompanyOriginator, CompanySmsAccount, SmsProvider]),
    AuthModule,
  ],
  controllers: [OriginatorRestrictionsController],
  providers: [OriginatorRestrictionsService],
  exports: [OriginatorRestrictionsService],
})
export class OriginatorRestrictionsModule {}
