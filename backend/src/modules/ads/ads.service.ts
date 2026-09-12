import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PricingService } from '../pricing/pricing.service.js';
import { ReferenceService } from '../reference/reference.service.js';
import { Role } from '../../common/enums/role.enum.js';
import { ProductType } from '../../common/enums/product-type.enum.js';
import { renderInstagramAdSvg } from './instagram-ad.template.js';
import { buildSmsTierLines } from './sms-tiers.js';

@Injectable()
export class AdsService {
  constructor(
    private readonly pricingService: PricingService,
    private readonly referenceService: ReferenceService,
  ) {}

  async createPriceListAd(
    priceListId: string,
    user: { id: string; role: string; companyId: string },
  ) {
    const lists = await this.pricingService.findAllLists(user);
    const list = lists.find((item) => item.id === priceListId);
    if (!list) {
      throw new NotFoundException('Fiyat listesi bulunamadı');
    }

    if (
      user.role === Role.DEALER &&
      list.ownerCompanyId &&
      list.ownerCompanyId !== user.companyId
    ) {
      throw new ForbiddenException('Bu fiyat listesine erişim yetkiniz yok');
    }

    const [items, products] = await Promise.all([
      this.pricingService.findListItems(priceListId),
      this.referenceService.findProducts(),
    ]);
    const productById = new Map(products.map((product) => [product.id, product]));

    const tiers = items
      .map((item) => {
        const product = item.product ?? productById.get(item.productId);
        return {
          creditAmount: product?.creditAmount ?? 0,
          unitPrice: Number(item.unitPrice ?? 0),
          productType: product?.productType,
        };
      })
      .filter(
        (tier) =>
          tier.productType === ProductType.SMS &&
          tier.creditAmount > 0 &&
          tier.unitPrice > 0,
      );

    const packages = buildSmsTierLines(tiers);

    if (!packages.length) {
      throw new NotFoundException(
        'Bu fiyat listesinde kayıtlı SMS fiyatı yok. Önce fiyatları kaydedin.',
      );
    }

    const model = {
      title: 'TOPLU SMS PAKETLERİ',
      subtitle: 'İhtiyacınıza uygun paketi seçin',
      listName: list.name,
      packages,
      cta: 'bizimle iletişime geçin',
    };

    return {
      listId: list.id,
      listName: list.name,
      width: 1080,
      height: 1080,
      mimeType: 'image/svg+xml',
      fileName: this.toFileName(list.name),
      packages,
      svg: renderInstagramAdSvg(model),
    };
  }

  private toFileName(name: string) {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9ğüşöçı\s-]/gi, '')
      .trim()
      .replace(/\s+/g, '-');
    return `reklam-${slug || 'fiyat'}.svg`;
  }
}
