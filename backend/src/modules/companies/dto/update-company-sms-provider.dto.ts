import { IsNumber, IsOptional, IsUUID, Max, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCompanySmsProviderDto {
  @IsUUID()
  providerId: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  creditRefundRate?: number | null;
}
