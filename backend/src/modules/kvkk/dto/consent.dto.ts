import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { KvkkConsentStatus } from '../../../common/enums/kvkk-consent-status.enum.js';
import { KvkkConsentMethod } from '../../../common/enums/kvkk-consent-method.enum.js';

export class KvkkConsentQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(KvkkConsentStatus)
  status?: KvkkConsentStatus;

  @IsOptional()
  @IsEnum(KvkkConsentMethod)
  method?: KvkkConsentMethod;

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

export class KvkkDashboardQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
