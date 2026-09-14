import { IsEnum, IsNumber, IsOptional, IsUUID, Max, Min, NotEquals } from 'class-validator';
import { Type } from 'class-transformer';
import { WalletType } from '../../../common/enums/wallet-type.enum.js';

export class LoadCreditDto {
  @IsUUID()
  companyId: string;

  @IsEnum(WalletType)
  walletType: WalletType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @NotEquals(0)
  @Min(-100_000_000)
  @Max(100_000_000)
  amount: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1_000_000)
  unitPrice?: number;
}
