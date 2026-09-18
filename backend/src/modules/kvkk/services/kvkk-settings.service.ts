import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createReadStream } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { Repository } from 'typeorm';
import { KvkkSetting } from '../entities/kvkk-setting.entity.js';
import { UpdateKvkkSettingsDto } from '../dto/settings.dto.js';
import { KvkkAccessService, type KvkkActor } from './kvkk-access.service.js';
import { toSettingDto } from './kvkk-presenter.js';
import { KvkkConsent } from '../entities/kvkk-consent.entity.js';
import { KvkkConsentStatus } from '../../../common/enums/kvkk-consent-status.enum.js';
import { KvkkConsentMethod } from '../../../common/enums/kvkk-consent-method.enum.js';
import { KvkkDashboardQueryDto } from '../dto/consent.dto.js';

const LOGO_MIME = new Map([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/webp', '.webp'],
]);
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

@Injectable()
export class KvkkSettingsService {
  constructor(
    @InjectRepository(KvkkSetting)
    private readonly settingRepository: Repository<KvkkSetting>,
    @InjectRepository(KvkkConsent)
    private readonly consentRepository: Repository<KvkkConsent>,
    private readonly access: KvkkAccessService,
  ) {}

  async get(actor: KvkkActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    return toSettingDto(await this.ensure(ownerCompanyId));
  }

  async update(dto: UpdateKvkkSettingsDto, actor: KvkkActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const setting = await this.ensure(ownerCompanyId);
    if (dto.smsConsentCheckEnabled !== undefined) setting.smsConsentCheckEnabled = dto.smsConsentCheckEnabled;
    if (dto.companyDisplayName !== undefined) setting.companyDisplayName = dto.companyDisplayName.trim() || undefined;
    if (dto.contactInfo !== undefined) setting.contactInfo = dto.contactInfo.trim() || undefined;
    return toSettingDto(await this.settingRepository.save(setting));
  }

  async uploadLogo(file: Express.Multer.File | undefined, actor: KvkkActor) {
    if (!file) throw new BadRequestException('Dosya seçilmedi');
    const extension = LOGO_MIME.get(file.mimetype);
    if (!extension) throw new BadRequestException('Yalnızca PNG, JPG veya WEBP yüklenebilir');
    if (file.size > MAX_LOGO_BYTES) throw new BadRequestException('Logo 2 MB sınırını aşıyor');

    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const setting = await this.ensure(ownerCompanyId);
    await this.deleteStoredFile(setting.logoUrl);

    const dir = join(process.cwd(), 'uploads', 'kvkk-logos', ownerCompanyId);
    await mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}${extname(file.originalname || '').toLowerCase() || extension}`;
    await writeFile(join(dir, filename), file.buffer);
    setting.logoUrl = join('uploads', 'kvkk-logos', ownerCompanyId, filename);
    return toSettingDto(await this.settingRepository.save(setting));
  }

  async openPublicLogo(ownerCompanyId: string) {
    const setting = await this.settingRepository.findOne({ where: { ownerCompanyId } });
    if (!setting?.logoUrl || /^https?:\/\//i.test(setting.logoUrl)) {
      throw new NotFoundException('Logo bulunamadı');
    }
    const absolute = join(process.cwd(), setting.logoUrl);
    return {
      stream: createReadStream(absolute),
      fileName: setting.logoUrl.split('/').pop() ?? 'logo',
      mime: this.mimeFromPath(setting.logoUrl),
    };
  }

  private async deleteStoredFile(relative?: string) {
    if (!relative || /^https?:\/\//i.test(relative)) return;
    try {
      await unlink(join(process.cwd(), relative));
    } catch {
      // already gone
    }
  }

  private mimeFromPath(path: string) {
    const lower = path.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }

  async dashboard(query: KvkkDashboardQueryDto, actor: KvkkActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const qb = this.consentRepository
      .createQueryBuilder('consent')
      .where('consent.ownerCompanyId = :ownerCompanyId', { ownerCompanyId });
    if (query.from) qb.andWhere('consent.createdAt >= :from', { from: new Date(query.from) });
    if (query.to) qb.andWhere('consent.createdAt < :to', { to: new Date(`${query.to}T23:59:59.999Z`) });

    const items = await qb.getMany();
    const count = (status?: KvkkConsentStatus, method?: KvkkConsentMethod) =>
      items.filter((item) => (status ? item.status === status : true) && (method ? item.method === method : true)).length;

    return {
      total: items.length,
      approved: count(KvkkConsentStatus.APPROVED),
      pending: count(KvkkConsentStatus.PENDING),
      cancelled: count(KvkkConsentStatus.CANCELLED),
      rejected: count(KvkkConsentStatus.REJECTED),
      shortCode: count(undefined, KvkkConsentMethod.SHORT_CODE),
      smsForm: count(undefined, KvkkConsentMethod.SMS_FORM),
      qr: count(undefined, KvkkConsentMethod.QR),
    };
  }

  async ensure(ownerCompanyId: string) {
    const existing = await this.settingRepository.findOne({ where: { ownerCompanyId } });
    if (existing) return existing;
    return this.settingRepository.save(this.settingRepository.create({ ownerCompanyId }));
  }
}
