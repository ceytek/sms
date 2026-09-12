import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyCredential } from './entities/company-credential.entity.js';
import { CredentialsService } from './credentials.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyCredential])],
  providers: [CredentialsService],
  exports: [CredentialsService],
})
export class CredentialsModule {}
