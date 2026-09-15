import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../companies/entities/company.entity.js';
import { CustomerSubcategory } from '../reference/entities/customer-subcategory.entity.js';
import { SmsCampaign } from './entities/sms-campaign.entity.js';
import { SmsCampaignSegment } from './entities/sms-campaign-segment.entity.js';
import { SmsCampaignRecipient } from './entities/sms-campaign-recipient.entity.js';
import { MessagingController } from './messaging.controller.js';
import { MessagingService } from './messaging.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Company,
      CustomerSubcategory,
      SmsCampaign,
      SmsCampaignSegment,
      SmsCampaignRecipient,
    ]),
    AuthModule,
  ],
  controllers: [MessagingController],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
