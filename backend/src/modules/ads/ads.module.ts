import { Module } from '@nestjs/common';
import { AdsController } from './ads.controller.js';
import { AdsService } from './ads.service.js';
import { PricingModule } from '../pricing/pricing.module.js';
import { ReferenceModule } from '../reference/reference.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [PricingModule, ReferenceModule, AuthModule],
  controllers: [AdsController],
  providers: [AdsService],
})
export class AdsModule {}
