import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { WalletType } from '../../../common/enums/wallet-type.enum.js';
import { HistoryPeriod } from '../../../common/enums/history-period.enum.js';

export class CreditCustomerQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}

export class CreditHistoryQueryDto {
  @IsEnum(WalletType)
  walletType: WalletType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @IsEnum(HistoryPeriod)
  period?: HistoryPeriod;
}
