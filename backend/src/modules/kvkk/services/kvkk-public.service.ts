import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../../companies/entities/company.entity.js';
import { KvkkForm } from '../entities/kvkk-form.entity.js';
import { KvkkFormLink } from '../entities/kvkk-form-link.entity.js';
import { KvkkQrCode } from '../entities/kvkk-qr-code.entity.js';
import { KvkkConsent } from '../entities/kvkk-consent.entity.js';
import { KvkkSetting } from '../entities/kvkk-setting.entity.js';
import { SubmitPublicKvkkFormDto } from '../dto/form.dto.js';
import { KvkkAccessService } from './kvkk-access.service.js';
import { KvkkTextsService } from './kvkk-texts.service.js';
import { KvkkFormLinkStatus } from '../../../common/enums/kvkk-form-link-status.enum.js';
import { KvkkConsentMethod } from '../../../common/enums/kvkk-consent-method.enum.js';
import { KvkkConsentStatus } from '../../../common/enums/kvkk-consent-status.enum.js';
import { toFormDto, toPublicLogoPath } from './kvkk-presenter.js';

@Injectable()
export class KvkkPublicService {
  constructor(
    @InjectRepository(KvkkForm)
    private readonly formRepository: Repository<KvkkForm>,
    @InjectRepository(KvkkFormLink)
    private readonly linkRepository: Repository<KvkkFormLink>,
    @InjectRepository(KvkkQrCode)
    private readonly qrRepository: Repository<KvkkQrCode>,
    @InjectRepository(KvkkConsent)
    private readonly consentRepository: Repository<KvkkConsent>,
    @InjectRepository(KvkkSetting)
    private readonly settingRepository: Repository<KvkkSetting>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly access: KvkkAccessService,
    private readonly textsService: KvkkTextsService,
  ) {}

  async load(token: string) {
    const resolved = await this.resolveToken(token);
    const form = await this.formRepository.findOne({
      where: { id: resolved.formId },
      relations: ['checkboxes', 'ownerCompany'],
    });
    if (!form?.isActive) throw new NotFoundException('Form bulunamadı veya pasif');
    const settings = await this.settingRepository.findOne({ where: { ownerCompanyId: form.ownerCompanyId } });
    const company = form.ownerCompany ?? (await this.companyRepository.findOne({ where: { id: form.ownerCompanyId } }));
    const currentText = form.textDocumentId
      ? await this.textsService.currentVersion(form.ownerCompanyId, form.textDocumentId)
      : null;
    return {
      source: resolved.source,
      prefill: resolved.prefill,
      form: {
        ...toFormDto(form),
        checkboxes: toFormDto(form).checkboxes.filter((item) => item.isActive),
        companyDisplayName: form.companyDisplayName || settings?.companyDisplayName || company?.name || '',
        logoUrl: toPublicLogoPath(form.ownerCompanyId, form.logoUrl || settings?.logoUrl),
        contactInfo: form.contactInfo || settings?.contactInfo || '',
      },
      text: currentText
        ? { title: currentText.title, bodyHtml: currentText.bodyHtml, version: currentText.version }
        : null,
    };
  }

  async submit(token: string, dto: SubmitPublicKvkkFormDto) {
    const resolved = await this.resolveToken(token);
    const form = await this.formRepository.findOne({
      where: { id: resolved.formId },
      relations: ['checkboxes'],
    });
    if (!form?.isActive) throw new NotFoundException('Form bulunamadı veya pasif');
    const phone = this.access.requirePhone(dto.mobilePhone);
    const activeBoxes = [...(form.checkboxes ?? [])].filter((item) => item.isActive);
    const checked = new Set(dto.checkedIds);
    for (const box of activeBoxes) {
      if (box.isRequired && !checked.has(box.id)) {
        throw new BadRequestException(`"${box.label}" onayı zorunludur`);
      }
    }
    const currentText = form.textDocumentId
      ? await this.textsService.currentVersion(form.ownerCompanyId, form.textDocumentId)
      : null;
    const answers = activeBoxes.map((item) => ({
      id: item.id,
      label: item.label,
      required: item.isRequired,
      checked: checked.has(item.id),
    }));
    const payload = {
      firstName: dto.firstName?.trim() ?? '',
      lastName: dto.lastName?.trim() ?? '',
      email: dto.email?.trim() ?? '',
      phone: phone.normalizedPhone,
    };

    if (resolved.source === 'LINK' && resolved.consentId) {
      const consent = await this.consentRepository.findOne({ where: { id: resolved.consentId } });
      if (!consent || consent.status !== KvkkConsentStatus.PENDING) {
        throw new BadRequestException('Bu link artık kullanılamaz');
      }
      Object.assign(consent, {
        firstName: dto.firstName?.trim() || consent.firstName,
        lastName: dto.lastName?.trim() || consent.lastName,
        email: dto.email?.trim(),
        mobilePhone: phone.mobilePhone,
        normalizedPhone: phone.normalizedPhone,
        status: KvkkConsentStatus.APPROVED,
        approvedAt: new Date(),
        textVersionId: currentText?.id,
        textVersionNumber: currentText?.version,
        textTitleSnapshot: currentText?.title,
        textBodySnapshot: currentText?.bodyHtml,
        checkboxAnswers: answers,
        formPayload: payload,
      });
      await this.consentRepository.save(consent);
      if (resolved.link) {
        resolved.link.status = KvkkFormLinkStatus.COMPLETED;
        await this.linkRepository.save(resolved.link);
      }
      return { id: consent.id, status: consent.status };
    }

    const consent = await this.consentRepository.save(
      this.consentRepository.create({
        ownerCompanyId: form.ownerCompanyId,
        firstName: dto.firstName?.trim(),
        lastName: dto.lastName?.trim(),
        email: dto.email?.trim(),
        mobilePhone: phone.mobilePhone,
        normalizedPhone: phone.normalizedPhone,
        status: KvkkConsentStatus.APPROVED,
        method: KvkkConsentMethod.QR,
        formId: form.id,
        formNameSnapshot: form.name,
        qrId: resolved.qrId,
        approvedAt: new Date(),
        textVersionId: currentText?.id,
        textVersionNumber: currentText?.version,
        textTitleSnapshot: currentText?.title,
        textBodySnapshot: currentText?.bodyHtml,
        checkboxAnswers: answers,
        formPayload: payload,
      }),
    );
    return { id: consent.id, status: consent.status };
  }

  private async resolveToken(token: string) {
    const link = await this.linkRepository.findOne({ where: { token } });
    if (link) {
      if (link.status !== KvkkFormLinkStatus.PENDING) {
        throw new BadRequestException('Bu form linki kullanılmış');
      }
      if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
        link.status = KvkkFormLinkStatus.EXPIRED;
        await this.linkRepository.save(link);
        throw new BadRequestException('Form linkinin süresi dolmuş');
      }
      return {
        source: 'LINK' as const,
        formId: link.formId,
        consentId: link.consentId,
        link,
        prefill: {
          mobilePhone: link.mobilePhone,
          firstName: link.firstName ?? '',
          lastName: link.lastName ?? '',
        },
      };
    }
    const qr = await this.qrRepository.findOne({ where: { token } });
    if (!qr || !qr.isActive) throw new NotFoundException('Geçersiz form bağlantısı');
    if (qr.expiresAt && qr.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('QR kodun süresi dolmuş');
    }
    return {
      source: 'QR' as const,
      formId: qr.formId,
      qrId: qr.id,
      prefill: { mobilePhone: '', firstName: '', lastName: '' },
    };
  }
}
