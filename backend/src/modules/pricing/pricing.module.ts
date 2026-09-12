import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceList } from './entities/price-list.entity.js';
import { PriceListItem } from './entities/price-list-item.entity.js';
import { CompanyPriceList } from '../companies/entities/company-price-list.entity.js';
import { PricingController } from './pricing.controller.js';
import { PricingService } from './pricing.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([PriceList, PriceListItem, CompanyPriceList]),
    AuthModule,
  ],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
