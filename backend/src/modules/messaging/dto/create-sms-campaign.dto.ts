import { ArrayNotEmpty, IsArray, IsDateString, IsEnum, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SmsCampaignSourceType } from '../../../common/enums/sms-campaign-source-type.enum.js';

export class CampaignSourceDto {
  @IsEnum(SmsCampaignSourceType)
  type: SmsCampaignSourceType;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  label?: string;

  @IsOptional()
  @IsUUID('4')
  groupId?: string;

  @IsOptional()
  @IsUUID('4')
  tagId?: string;

  @IsOptional()
  @IsUUID('4')
  subcategoryId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  contactIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  excludedContactIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  excludedCompanyIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  phones?: string[];
}

export class CreateSmsCampaignDto {
  @IsString()
  @MinLength(8)
  @MaxLength(80)
  idempotencyKey: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsIn(['DUYURU', 'BILGILENDIRME', 'HATIRLATMA', 'KAMPANYA', 'DIGER'])
  category?: string;

  @IsOptional()
  @IsIn(['BULK', 'SINGLE', 'PERSONALIZED', 'SCHEDULED'])
  composition?: 'BULK' | 'SINGLE' | 'PERSONALIZED' | 'SCHEDULED';

  @IsUUID('4')
  originatorId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body: string;

  @IsIn(['DRAFT', 'SEND', 'SCHEDULE'])
  mode: 'DRAFT' | 'SEND' | 'SCHEDULE';

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CampaignSourceDto)
  sources: CampaignSourceDto[];
}
