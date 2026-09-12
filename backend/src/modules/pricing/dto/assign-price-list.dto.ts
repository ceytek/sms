import { IsUUID } from 'class-validator';

export class AssignPriceListDto {
  @IsUUID()
  companyId: string;

  @IsUUID()
  priceListId: string;
}
