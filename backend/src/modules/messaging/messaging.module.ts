import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../companies/entities/company.entity.js';
import { CompanyOriginator } from '../companies/entities/company-originator.entity.js';
import { CompanySmsAccount } from '../companies/entities/company-sms-account.entity.js';
import { CompanyService } from '../companies/entities/company-service.entity.js';
import { CustomerSubcategory } from '../reference/entities/customer-subcategory.entity.js';
import { SmsProvider } from '../reference/entities/sms-provider.entity.js';
import { Contact } from '../contacts/entities/contact.entity.js';
import { ContactGroupMember } from '../contacts/entities/contact-group-member.entity.js';
import { ContactTagMember } from '../contacts/entities/contact-tag-member.entity.js';
import { KvkkConsent } from '../kvkk/entities/kvkk-consent.entity.js';
import { KvkkSetting } from '../kvkk/entities/kvkk-setting.entity.js';
import { OriginatorBlockedNumber } from '../originator-restrictions/entities/originator-blocked-number.entity.js';
import { Wallet } from '../wallets/entities/wallet.entity.js';
import { WalletTransaction } from '../wallets/entities/wallet-transaction.entity.js';
import { SmsCampaign } from './entities/sms-campaign.entity.js';
import { SmsCampaignSegment } from './entities/sms-campaign-segment.entity.js';
import { SmsCampaignRecipient } from './entities/sms-campaign-recipient.entity.js';
import { SmsCampaignSource } from './entities/sms-campaign-source.entity.js';
import { SmsCampaignBatch } from './entities/sms-campaign-batch.entity.js';
import { SmsTemplate } from './entities/sms-template.entity.js';
import { MessagingController } from './messaging.controller.js';
import { MessagingService } from './messaging.service.js';
import { SmsMessagingController, SmsHealthController, SmsWebhookController } from './sms-messaging.controller.js';
import { SmsCampaignService } from './services/sms-campaign.service.js';
import { SmsPrepareService } from './services/sms-prepare.service.js';
import { SmsSendService } from './services/sms-send.service.js';
import { SmsBalanceService } from './services/sms-balance.service.js';
import { CampaignStateService } from './services/campaign-state.service.js';
import { SmsWorkerHost } from './services/sms-worker.host.js';
import { SmsQueueService } from './queue/sms-queue.service.js';
import { ProviderRateLimiter } from './queue/provider-rate-limiter.js';
import { MockSmsProviderAdapter } from './adapters/mock.adapter.js';
import { KocaeliSmsProviderAdapter } from './adapters/kocaeli.adapter.js';
import { SmsProviderRegistry } from './adapters/sms-provider.registry.js';
import { SmsAccountResolverService } from './services/sms-account-resolver.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { CredentialsModule } from '../credentials/credentials.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Company,
      CompanyOriginator,
      CompanySmsAccount,
      CompanyService,
      CustomerSubcategory,
      SmsProvider,
      Contact,
      ContactGroupMember,
      ContactTagMember,
      KvkkConsent,
      KvkkSetting,
      OriginatorBlockedNumber,
      Wallet,
      WalletTransaction,
      SmsCampaign,
      SmsCampaignSegment,
      SmsCampaignRecipient,
      SmsCampaignSource,
      SmsCampaignBatch,
      SmsTemplate,
    ]),
    AuthModule,
    AuditModule,
    CredentialsModule,
  ],
  controllers: [MessagingController, SmsMessagingController, SmsHealthController, SmsWebhookController],
  providers: [
    MessagingService,
    SmsCampaignService,
    SmsPrepareService,
    SmsSendService,
    SmsBalanceService,
    CampaignStateService,
    SmsWorkerHost,
    SmsQueueService,
    ProviderRateLimiter,
    MockSmsProviderAdapter,
    KocaeliSmsProviderAdapter,
    SmsProviderRegistry,
    SmsAccountResolverService,
  ],
  exports: [MessagingService, SmsCampaignService, SmsWorkerHost, SmsQueueService],
})
export class MessagingModule {}
