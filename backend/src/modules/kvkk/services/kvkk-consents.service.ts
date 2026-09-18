import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KvkkConsent } from '../entities/kvkk-consent.entity.js';
import { KvkkConsentQueryDto } from '../dto/consent.dto.js';
import { KvkkAccessService, type KvkkActor } from './kvkk-access.service.js';
import { KvkkSettingsService } from './kvkk-settings.service.js';
import { toConsentDetailDto, toConsentListDto } from './kvkk-presenter.js';
import { KvkkConsentStatus } from '../../../common/enums/kvkk-consent-status.enum.js';
import { normalizeTrMobile } from '../../../common/phone/normalize-tr-mobile.js';

@Injectable()
export class KvkkConsentsService {
  constructor(
    @InjectRepository(KvkkConsent)
    private readonly consentRepository: Repository<KvkkConsent>,
    private readonly access: KvkkAccessService,
    private readonly settingsService: KvkkSettingsService,
  ) {}

  async list(query: KvkkConsentQueryDto, actor: KvkkActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.consentRepository
      .createQueryBuilder('consent')
      .leftJoinAndSelect('consent.form', 'form')
      .leftJoinAndSelect('consent.qr', 'qr')
      .where('consent.ownerCompanyId = :ownerCompanyId', { ownerCompanyId });
    if (query.status) qb.andWhere('consent.status = :status', { status: query.status });
    if (query.method) qb.andWhere('consent.method = :method', { method: query.method });
    if (query.from) qb.andWhere('consent.createdAt >= :from', { from: new Date(query.from) });
    if (query.to) qb.andWhere('consent.createdAt < :to', { to: new Date(`${query.to}T23:59:59.999Z`) });
    if (query.search) {
      const phone = normalizeTrMobile(query.search);
      qb.andWhere(
        '(consent.firstName ILIKE :search OR consent.lastName ILIKE :search OR consent.mobilePhone ILIKE :search OR consent.normalizedPhone = :phone)',
        { search: `%${query.search}%`, phone: phone ?? query.search },
      );
    }
    const [items, total] = await qb
      .orderBy('consent.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items: items.map((item) => toConsentListDto(item)), total, page, limit };
  }

  async getOne(id: string, actor: KvkkActor) {
    return toConsentDetailDto(await this.requireConsent(id, actor));
  }

  async cancel(id: string, actor: KvkkActor) {
    const consent = await this.requireConsent(id, actor);
    if (consent.status !== KvkkConsentStatus.APPROVED) {
      throw new BadRequestException('Yalnızca onaylı izin iptal edilebilir');
    }
    consent.status = KvkkConsentStatus.CANCELLED;
    consent.cancelledAt = new Date();
    consent.cancelledBy = actor.id;
    consent.cancelSource = actor.impersonatedBy ? 'IMPERSONATION' : 'USER';
    await this.consentRepository.save(consent);
    return toConsentDetailDto(consent);
  }

  async hasActiveConsent(ownerCompanyId: string, rawPhone: string) {
    const normalized = normalizeTrMobile(rawPhone);
    if (!normalized) return false;
    const found = await this.consentRepository.findOne({
      where: {
        ownerCompanyId,
        normalizedPhone: normalized,
        status: KvkkConsentStatus.APPROVED,
      },
    });
    return Boolean(found);
  }

  async shouldExcludeFromSms(ownerCompanyId: string, rawPhone: string) {
    if (!(await this.access.isEnabled(ownerCompanyId))) return false;
    const settings = await this.settingsService.ensure(ownerCompanyId);
    if (!settings.smsConsentCheckEnabled) return false;
    return !(await this.hasActiveConsent(ownerCompanyId, rawPhone));
  }

  private async requireConsent(id: string, actor: KvkkActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const consent = await this.consentRepository.findOne({
      where: { id, ownerCompanyId },
      relations: ['form', 'qr'],
    });
    if (!consent) throw new NotFoundException('İzin kaydı bulunamadı');
    return consent;
  }
}
