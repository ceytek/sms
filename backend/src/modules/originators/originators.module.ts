import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyOriginator } from '../companies/entities/company-originator.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import { BannedOriginator } from './entities/banned-originator.entity.js';
import { OriginatorsController } from './originators.controller.js';
import { OriginatorsService } from './originators.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { InboxModule } from '../inbox/inbox.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompanyOriginator, Company, BannedOriginator]),
    AuthModule,
    InboxModule,
  ],
  controllers: [OriginatorsController],
  providers: [OriginatorsService],
  exports: [OriginatorsService],
})
export class OriginatorsModule {}
