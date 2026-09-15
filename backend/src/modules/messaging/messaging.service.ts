import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Company } from '../companies/entities/company.entity.js';
import { CustomerSubcategory } from '../reference/entities/customer-subcategory.entity.js';
import { SmsCampaign } from './entities/sms-campaign.entity.js';
import { SmsCampaignSegment } from './entities/sms-campaign-segment.entity.js';
import { SmsCampaignRecipient } from './entities/sms-campaign-recipient.entity.js';
import { MessagingPreviewDto } from './dto/messaging-preview.dto.js';
import { CreateCampaignDto } from './dto/create-campaign.dto.js';
import { Role } from '../../common/enums/role.enum.js';
import { CompanyStatus } from '../../common/enums/company-status.enum.js';
import { SmsSendType } from '../../common/enums/sms-send-type.enum.js';
import { SmsAudienceSource } from '../../common/enums/sms-audience-source.enum.js';
import { SmsCampaignStatus } from '../../common/enums/sms-campaign-status.enum.js';
import { SmsRecipientStatus } from '../../common/enums/sms-recipient-status.enum.js';
import { normalizeTrMobile, smsEncodingAndParts } from './sms-text.js';

type Actor = { id: string; role: string; companyId: string };

type BuiltRecipient = {
  companyId: string;
  companyName: string;
  subcategoryId: string;
  subcategoryName: string;
  mobileRaw?: string;
  mobileNormalized?: string;
  status: SmsRecipientStatus;
  excludeReason?: string;
};

@Injectable()
export class MessagingService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(CustomerSubcategory)
    private readonly subcategoryRepository: Repository<CustomerSubcategory>,
  ) {}

  async preview(dto: MessagingPreviewDto, actor: Actor) {
    const built = await this.buildAudience(dto.subcategoryIds, dto.excludedCompanyIds ?? [], actor);
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const included = built.recipients.filter((row) => row.status === SmsRecipientStatus.INCLUDED);
    const start = (page - 1) * limit;

    return {
      sendType: SmsSendType.DEALER_TO_CUSTOMERS,
      audienceSource: SmsAudienceSource.CUSTOMER_CATEGORY,
      selectedTypeCount: built.segments.length,
      companyCount: built.companyCount,
      validRecipientCount: built.validRecipientCount,
      invalidRecipientCount: built.invalidCount,
      duplicateCount: built.duplicateCount,
      excludedCount: built.excludedCount,
      segments: built.segments,
      recipients: included.slice(start, start + limit).map((row) => ({
        companyId: row.companyId,
        companyName: row.companyName,
        subcategoryName: row.subcategoryName,
        mobile: row.mobileRaw,
      })),
      meta: {
        page,
        limit,
        total: included.length,
        totalPages: Math.max(1, Math.ceil(included.length / limit)),
      },
    };
  }

  async createMockCampaign(dto: CreateCampaignDto, actor: Actor) {
    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException('Mesaj boş olamaz');
    }

    const built = await this.buildAudience(dto.subcategoryIds, dto.excludedCompanyIds ?? [], actor);
    const { encoding, parts } = smsEncodingAndParts(body);

    return this.dataSource.transaction(async (manager) => {
      const campaign = await manager.save(
        manager.create(SmsCampaign, {
          senderCompanyId: actor.companyId,
          createdBy: actor.id,
          sendType: SmsSendType.DEALER_TO_CUSTOMERS,
          audienceSource: SmsAudienceSource.CUSTOMER_CATEGORY,
          status: SmsCampaignStatus.MOCK_SENT,
          body,
          encoding,
          smsParts: parts,
          estimatedUnits: built.validRecipientCount * parts,
          isMock: true,
          companyCount: built.companyCount,
          validRecipientCount: built.validRecipientCount,
          invalidCount: built.invalidCount,
          duplicateCount: built.duplicateCount,
          excludedCount: built.excludedCount,
          successCount: 0,
          failCount: 0,
          sentAt: new Date(),
        }),
      );

      if (built.segments.length) {
        await manager.save(
          built.segments.map((segment) =>
            manager.create(SmsCampaignSegment, {
              campaignId: campaign.id,
              subcategoryId: segment.subcategoryId,
              subcategoryName: segment.name,
              categoryName: segment.categoryName,
              companyCount: segment.companyCount,
            }),
          ),
        );
      }

      if (built.recipients.length) {
        await manager.save(
          built.recipients.map((row) =>
            manager.create(SmsCampaignRecipient, {
              campaignId: campaign.id,
              companyId: row.companyId,
              subcategoryId: row.subcategoryId,
              mobileRaw: row.mobileRaw,
              mobileNormalized: row.mobileNormalized,
              status: row.status,
              excludeReason: row.excludeReason,
            }),
          ),
        );
      }

      return {
        id: campaign.id,
        sendType: campaign.sendType,
        audienceSource: campaign.audienceSource,
        status: campaign.status,
        isMock: true,
        message: 'Gönderim kaydı oluşturuldu. Gerçek SMS gönderimi henüz kapalı.',
        selectedTypeCount: built.segments.length,
        companyCount: built.companyCount,
        validRecipientCount: built.validRecipientCount,
        invalidRecipientCount: built.invalidCount,
        duplicateCount: built.duplicateCount,
        excludedCount: built.excludedCount,
        smsParts: parts,
        estimatedUnits: built.validRecipientCount * parts,
      };
    });
  }

  private async buildAudience(subcategoryIds: string[], excludedCompanyIds: string[], actor: Actor) {
    const uniqueIds = [...new Set(subcategoryIds)];
    const subcategories = await this.subcategoryRepository.find({
      where: { id: In(uniqueIds) },
      relations: ['category'],
    });
    if (subcategories.length !== uniqueIds.length) {
      throw new BadRequestException('Geçersiz müşteri türü seçildi');
    }

    const qb = this.companyRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.subcategory', 'subcategory')
      .where('company.deletedAt IS NULL')
      .andWhere('company.status = :status', { status: CompanyStatus.ACTIVE })
      .andWhere('company.isDealer = false')
      .andWhere('company.subcategoryId IN (:...subcategoryIds)', { subcategoryIds: uniqueIds });

    if (actor.role === Role.DEALER) {
      qb.andWhere('company.dealerCompanyId = :dealerId', { dealerId: actor.companyId });
    } else {
      qb.andWhere('company.dealerCompanyId IS NULL');
    }

    const companies = await qb.orderBy('company.name', 'ASC').getMany();
    const excluded = new Set(excludedCompanyIds);
    const seenPhones = new Set<string>();
    const recipients: BuiltRecipient[] = [];
    const segmentCounts = new Map<string, number>();

    for (const company of companies) {
      const subcategoryId = company.subcategoryId as string;
      segmentCounts.set(subcategoryId, (segmentCounts.get(subcategoryId) ?? 0) + 1);
      const subcategoryName = company.subcategory?.name ?? '';

      if (excluded.has(company.id)) {
        recipients.push({
          companyId: company.id,
          companyName: company.name,
          subcategoryId,
          subcategoryName,
          mobileRaw: company.mobile,
          status: SmsRecipientStatus.EXCLUDED,
          excludeReason: 'USER_REMOVED',
        });
        continue;
      }

      const normalized = normalizeTrMobile(company.mobile);
      if (!normalized) {
        recipients.push({
          companyId: company.id,
          companyName: company.name,
          subcategoryId,
          subcategoryName,
          mobileRaw: company.mobile,
          status: SmsRecipientStatus.INVALID,
          excludeReason: company.mobile ? 'INVALID_MOBILE' : 'MISSING_MOBILE',
        });
        continue;
      }

      if (seenPhones.has(normalized)) {
        recipients.push({
          companyId: company.id,
          companyName: company.name,
          subcategoryId,
          subcategoryName,
          mobileRaw: company.mobile,
          mobileNormalized: normalized,
          status: SmsRecipientStatus.DUPLICATE,
          excludeReason: 'DUPLICATE_MOBILE',
        });
        continue;
      }

      seenPhones.add(normalized);
      recipients.push({
        companyId: company.id,
        companyName: company.name,
        subcategoryId,
        subcategoryName,
        mobileRaw: company.mobile,
        mobileNormalized: normalized,
        status: SmsRecipientStatus.INCLUDED,
      });
    }

    const segments = subcategories.map((item) => ({
      subcategoryId: item.id,
      name: item.name,
      categoryName: item.category?.name ?? '',
      companyCount: segmentCounts.get(item.id) ?? 0,
    }));

    return {
      segments,
      recipients,
      companyCount: companies.length,
      validRecipientCount: recipients.filter((row) => row.status === SmsRecipientStatus.INCLUDED).length,
      invalidCount: recipients.filter((row) => row.status === SmsRecipientStatus.INVALID).length,
      duplicateCount: recipients.filter((row) => row.status === SmsRecipientStatus.DUPLICATE).length,
      excludedCount: recipients.filter((row) => row.status === SmsRecipientStatus.EXCLUDED).length,
    };
  }
}
