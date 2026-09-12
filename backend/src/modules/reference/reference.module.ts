import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { City } from './entities/city.entity.js';
import { District } from './entities/district.entity.js';
import { SmsProvider } from './entities/sms-provider.entity.js';
import { Service } from './entities/service.entity.js';
import { Product } from './entities/product.entity.js';
import { PriceList } from '../pricing/entities/price-list.entity.js';
import { CompanySmsAccount } from '../companies/entities/company-sms-account.entity.js';
import { ReferenceController } from './reference.controller.js';
import { ProviderController } from './provider.controller.js';
import { ReferenceService } from './reference.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      City,
      District,
      SmsProvider,
      Service,
      Product,
      PriceList,
      CompanySmsAccount,
    ]),
    AuthModule,
  ],
  controllers: [ReferenceController, ProviderController],
  providers: [ReferenceService],
  exports: [ReferenceService],
})
export class ReferenceModule {}
