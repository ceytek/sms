import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class PriceListItemDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class BulkUpdatePriceListItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceListItemDto)
  items: PriceListItemDto[];
}
