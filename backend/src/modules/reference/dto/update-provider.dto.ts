import { IsString, IsOptional, MaxLength, IsBoolean, IsObject, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ProviderRateLimitsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  requestPerSecond?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  messagePerSecond?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxBatchSize?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  batchesPerSecond?: number;
}

export class UpdateProviderDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  configSchema?: Record<string, unknown>;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProviderRateLimitsDto)
  rateLimits?: ProviderRateLimitsDto;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  password?: string;
}
