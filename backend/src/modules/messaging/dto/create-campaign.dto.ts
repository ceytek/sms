import { ArrayNotEmpty, IsArray, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateCampaignDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  subcategoryIds: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  excludedCompanyIds?: string[];

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body: string;
}
