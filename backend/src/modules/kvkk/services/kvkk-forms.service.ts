import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KvkkForm } from '../entities/kvkk-form.entity.js';
import { KvkkFormCheckbox } from '../entities/kvkk-form-checkbox.entity.js';
import { KvkkFormLink } from '../entities/kvkk-form-link.entity.js';
import { KvkkConsent } from '../entities/kvkk-consent.entity.js';
import { CreateKvkkFormDto, CreateKvkkFormLinkDto, UpdateKvkkFormDto } from '../dto/form.dto.js';
import { KvkkAccessService, type KvkkActor } from './kvkk-access.service.js';
import { KvkkTextsService } from './kvkk-texts.service.js';
import { KvkkSettingsService } from './kvkk-settings.service.js';
import { toFormDto, toPublicLogoPath } from './kvkk-presenter.js';
import { KvkkFormLinkStatus } from '../../../common/enums/kvkk-form-link-status.enum.js';
import { KvkkConsentMethod } from '../../../common/enums/kvkk-consent-method.enum.js';
import { KvkkConsentStatus } from '../../../common/enums/kvkk-consent-status.enum.js';

const ALLOWED_FIELDS = new Set(['firstName', 'lastName', 'phone', 'email']);

@Injectable()
export class KvkkFormsService {
  constructor(
    @InjectRepository(KvkkForm)
    private readonly formRepository: Repository<KvkkForm>,
    @InjectRepository(KvkkFormCheckbox)
    private readonly checkboxRepository: Repository<KvkkFormCheckbox>,
    @InjectRepository(KvkkFormLink)
    private readonly linkRepository: Repository<KvkkFormLink>,
    @InjectRepository(KvkkConsent)
    private readonly consentRepository: Repository<KvkkConsent>,
    private readonly access: KvkkAccessService,
    private readonly textsService: KvkkTextsService,
    private readonly settingsService: KvkkSettingsService,
  ) {}

  async list(actor: KvkkActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const forms = await this.formRepository.find({
      where: { ownerCompanyId },
      order: { createdAt: 'DESC' },
    });
    return forms.map((item) => toFormDto(item));
  }

  async getOne(id: string, actor: KvkkActor) {
    return toFormDto(await this.requireForm(id, actor));
  }

  async create(dto: CreateKvkkFormDto, actor: KvkkActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    if (dto.textDocumentId) await this.textsService.currentVersion(ownerCompanyId, dto.textDocumentId);
    const form = await this.formRepository.save(
      this.formRepository.create({
        ownerCompanyId,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        title: dto.title.trim(),
        subtitle: dto.subtitle?.trim(),
        logoUrl: dto.logoUrl?.trim(),
        companyDisplayName: dto.companyDisplayName?.trim(),
        contactInfo: dto.contactInfo?.trim(),
        textDocumentId: dto.textDocumentId,
        fields: this.normalizeFields(dto.fields),
        isActive: dto.isActive ?? true,
        createdBy: actor.id,
      }),
    );
    await this.replaceCheckboxes(form.id, dto.checkboxes ?? []);
    return this.getOne(form.id, actor);
  }

  async update(id: string, dto: UpdateKvkkFormDto, actor: KvkkActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const form = await this.requireForm(id, actor);
    if (dto.name !== undefined) form.name = dto.name.trim();
    if (dto.description !== undefined) form.description = dto.description.trim() || undefined;
    if (dto.title !== undefined) form.title = dto.title.trim();
    if (dto.subtitle !== undefined) form.subtitle = dto.subtitle.trim() || undefined;
    if (dto.logoUrl !== undefined) form.logoUrl = dto.logoUrl.trim() || undefined;
    if (dto.companyDisplayName !== undefined) form.companyDisplayName = dto.companyDisplayName.trim() || undefined;
    if (dto.contactInfo !== undefined) form.contactInfo = dto.contactInfo.trim() || undefined;
    if (dto.textDocumentId !== undefined) {
      if (dto.textDocumentId) await this.textsService.currentVersion(ownerCompanyId, dto.textDocumentId);
      form.textDocumentId = dto.textDocumentId || undefined;
    }
    if (dto.fields) form.fields = this.normalizeFields(dto.fields);
    if (dto.isActive !== undefined) form.isActive = dto.isActive;
    await this.formRepository.save(form);
    if (dto.checkboxes) await this.replaceCheckboxes(form.id, dto.checkboxes);
    return this.getOne(id, actor);
  }

  async createLink(formId: string, dto: CreateKvkkFormLinkDto, actor: KvkkActor) {
    const form = await this.requireForm(formId, actor);
    if (!form.isActive) throw new BadRequestException('Form pasif');
    const phone = this.access.requirePhone(dto.mobilePhone);
    const token = this.access.newToken();
    const consent = await this.consentRepository.save(
      this.consentRepository.create({
        ownerCompanyId: form.ownerCompanyId,
        firstName: dto.firstName?.trim(),
        lastName: dto.lastName?.trim(),
        mobilePhone: phone.mobilePhone,
        normalizedPhone: phone.normalizedPhone,
        status: KvkkConsentStatus.PENDING,
        method: KvkkConsentMethod.SMS_FORM,
        formId: form.id,
        formNameSnapshot: form.name,
        createdBy: actor.id,
      }),
    );
    const link = await this.linkRepository.save(
      this.linkRepository.create({
        ownerCompanyId: form.ownerCompanyId,
        formId: form.id,
        consentId: consent.id,
        token,
        mobilePhone: phone.mobilePhone,
        normalizedPhone: phone.normalizedPhone,
        firstName: dto.firstName?.trim(),
        lastName: dto.lastName?.trim(),
        status: KvkkFormLinkStatus.PENDING,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: actor.id,
      }),
    );
    consent.formLinkId = link.id;
    await this.consentRepository.save(consent);
    return {
      id: link.id,
      consentId: consent.id,
      publicUrl: this.access.publicFormUrl(token),
      expiresAt: link.expiresAt,
    };
  }

  async requireForm(id: string, actor: KvkkActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const form = await this.formRepository.findOne({ where: { id, ownerCompanyId } });
    if (!form) throw new NotFoundException('Form bulunamadı');
    return form;
  }

  async publicBranding(form: KvkkForm) {
    const settings = await this.settingsService.ensure(form.ownerCompanyId);
    return {
      companyDisplayName: form.companyDisplayName || settings.companyDisplayName || form.ownerCompany?.name || '',
      logoUrl: toPublicLogoPath(form.ownerCompanyId, form.logoUrl || settings.logoUrl),
      contactInfo: form.contactInfo || settings.contactInfo || '',
    };
  }

  private normalizeFields(fields?: string[]) {
    const next = (fields ?? ['firstName', 'lastName', 'phone', 'email']).filter((item) => ALLOWED_FIELDS.has(item));
    if (!next.includes('phone')) next.unshift('phone');
    return [...new Set(next)];
  }

  private async replaceCheckboxes(
    formId: string,
    items: { id?: string; label: string; isRequired?: boolean; isActive?: boolean }[],
  ) {
    await this.checkboxRepository.delete({ formId });
    if (!items.length) return;
    await this.checkboxRepository.save(
      items.map((item, index) =>
        this.checkboxRepository.create({
          formId,
          label: item.label.trim(),
          isRequired: item.isRequired ?? true,
          isActive: item.isActive ?? true,
          sortOrder: index,
        }),
      ),
    );
  }
}
