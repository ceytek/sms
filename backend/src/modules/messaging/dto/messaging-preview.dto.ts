import { ArrayNotEmpty, IsArray, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class MessagingPreviewDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  subcategoryIds: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  excludedCompanyIds?: string[];

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
  limit?: number = 20;
}
