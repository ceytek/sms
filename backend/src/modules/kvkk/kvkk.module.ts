import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Service } from '../reference/entities/service.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import { CompanyService } from '../companies/entities/company-service.entity.js';
import { KvkkSetting } from './entities/kvkk-setting.entity.js';
import { KvkkTextDocument } from './entities/kvkk-text-document.entity.js';
import { KvkkTextVersion } from './entities/kvkk-text-version.entity.js';
import { KvkkForm } from './entities/kvkk-form.entity.js';
import { KvkkFormCheckbox } from './entities/kvkk-form-checkbox.entity.js';
import { KvkkQrCode } from './entities/kvkk-qr-code.entity.js';
import { KvkkFormLink } from './entities/kvkk-form-link.entity.js';
import { KvkkOtpChallenge } from './entities/kvkk-otp-challenge.entity.js';
import { KvkkConsent } from './entities/kvkk-consent.entity.js';
import { KvkkAccessService } from './services/kvkk-access.service.js';
import { KvkkSettingsService } from './services/kvkk-settings.service.js';
import { KvkkTextsService } from './services/kvkk-texts.service.js';
import { KvkkFormsService } from './services/kvkk-forms.service.js';
import { KvkkConsentsService } from './services/kvkk-consents.service.js';
import { KvkkOtpService } from './services/kvkk-otp.service.js';
import { KvkkQrService } from './services/kvkk-qr.service.js';
import { KvkkPublicService } from './services/kvkk-public.service.js';
import { KvkkEnabledGuard } from './kvkk-enabled.guard.js';
import { SHORT_CODE_PROVIDER, StubShortCodeProvider } from './providers/short-code.provider.js';
import { KvkkController } from './kvkk.controller.js';
import { KvkkTextsController } from './kvkk-texts.controller.js';
import { KvkkFormsController } from './kvkk-forms.controller.js';
import { KvkkConsentsController } from './kvkk-consents.controller.js';
import { KvkkOtpController } from './kvkk-otp.controller.js';
import { KvkkQrController } from './kvkk-qr.controller.js';
import { KvkkPublicController } from './kvkk-public.controller.js';
import { KvkkPublicBrandingController } from './kvkk-public-branding.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Company,
      CompanyService,
      Service,
      KvkkSetting,
      KvkkTextDocument,
      KvkkTextVersion,
      KvkkForm,
      KvkkFormCheckbox,
      KvkkQrCode,
      KvkkFormLink,
      KvkkOtpChallenge,
      KvkkConsent,
    ]),
    AuthModule,
  ],
  controllers: [
    KvkkPublicBrandingController,
    KvkkPublicController,
    KvkkController,
    KvkkTextsController,
    KvkkFormsController,
    KvkkConsentsController,
    KvkkOtpController,
    KvkkQrController,
  ],
  providers: [
    KvkkAccessService,
    KvkkSettingsService,
    KvkkTextsService,
    KvkkFormsService,
    KvkkConsentsService,
    KvkkOtpService,
    KvkkQrService,
    KvkkPublicService,
    KvkkEnabledGuard,
    StubShortCodeProvider,
    { provide: SHORT_CODE_PROVIDER, useExisting: StubShortCodeProvider },
  ],
  exports: [KvkkConsentsService, KvkkAccessService, KvkkSettingsService],
})
export class KvkkModule {}
