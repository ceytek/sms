import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class KvkkCheckboxInputDto {
  @IsOptional()
  @IsUUID('4')
  id?: string;

  @IsString()
  @MaxLength(500)
  label: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateKvkkFormDto {
  @IsString()
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  subtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyDisplayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  contactInfo?: string;

  @IsOptional()
  @IsUUID('4')
  textDocumentId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KvkkCheckboxInputDto)
  checkboxes?: KvkkCheckboxInputDto[];
}

export class UpdateKvkkFormDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  subtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyDisplayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  contactInfo?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== "")
  @IsUUID("4")
  textDocumentId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KvkkCheckboxInputDto)
  checkboxes?: KvkkCheckboxInputDto[];
}

export class CreateKvkkFormLinkDto {
  @IsString()
  @MaxLength(40)
  mobilePhone: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;
}

export class SubmitPublicKvkkFormDto {
  @IsString()
  @MaxLength(40)
  mobilePhone: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(0)
  checkedIds: string[];
}
