import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ContactBulkAction } from '../../../common/enums/contact-bulk-action.enum.js';
import { ContactDuplicatePolicy } from '../../../common/enums/contact-duplicate-policy.enum.js';
import { ContactStatus } from '../../../common/enums/contact-status.enum.js';

export class ContactBulkActionDto {
  @IsEnum(ContactBulkAction)
  action: ContactBulkAction;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @IsUUID('4', { each: true })
  ids: string[];

  @IsOptional()
  @IsUUID('4')
  groupId?: string;

  @IsOptional()
  @IsUUID('4')
  tagId?: string;
}

export class BulkNumbersDto {
  @IsString()
  @MaxLength(500000)
  numbers: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(50)
  groupIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(50)
  tagIds?: string[];

  @IsOptional()
  @IsEnum(ContactDuplicatePolicy)
  duplicatePolicy?: ContactDuplicatePolicy;

  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;
}

export class ImportMappingDto {
  @IsString()
  mobile: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, string>;
}

export class ImportAnalyzeDto {
  @IsUUID('4')
  jobId: string;

  @ValidateNested()
  @Type(() => ImportMappingDto)
  mapping: ImportMappingDto;
}

export class ImportCommitDto {
  @IsUUID('4')
  jobId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ImportMappingDto)
  mapping?: ImportMappingDto;

  @IsOptional()
  @IsEnum(ContactDuplicatePolicy)
  duplicatePolicy?: ContactDuplicatePolicy;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(50)
  groupIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(50)
  tagIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  autoGroupName?: string;

  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;
}

export class ImportFromCompaniesDto {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(5000)
  companyIds?: string[];

  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsOptional()
  @IsUUID('4')
  subcategoryId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(50)
  groupIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  autoGroupName?: string;

  @IsOptional()
  @IsEnum(ContactDuplicatePolicy)
  duplicatePolicy?: ContactDuplicatePolicy;
}

export class CompanySourceQueryDto {
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsOptional()
  @IsUUID('4')
  subcategoryId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
