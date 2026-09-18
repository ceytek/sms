import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../companies/entities/company.entity.js';
import { Wallet } from '../wallets/entities/wallet.entity.js';
import { WalletTransaction } from '../wallets/entities/wallet-transaction.entity.js';
import { User } from '../auth/entities/user.entity.js';
import { CreditsController } from './credits.controller.js';
import { CustomerCreditsController } from './customer-credits.controller.js';
import { CreditsService } from './credits.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, Wallet, WalletTransaction, User]),
    AuthModule,
  ],
  controllers: [CreditsController, CustomerCreditsController],
  providers: [CreditsService],
  exports: [CreditsService],
})
export class CreditsModule {}
