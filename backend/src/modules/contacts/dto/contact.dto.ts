import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ContactStatus } from '../../../common/enums/contact-status.enum.js';

function emptyOrPartialEmail({ value }: { value: unknown }) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.includes('@') ? trimmed : undefined;
}

export class CreateContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @IsString()
  @MaxLength(40)
  mobilePhone: string;

  @IsOptional()
  @Transform(emptyOrPartialEmail)
  @ValidateIf((_, value) => typeof value === 'string' && value.includes('@'))
  @IsEmail({}, { message: 'Geçerli bir e-posta girin veya boş bırakın' })
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;

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
  @IsObject()
  customFields?: Record<string, string>;
}

export class UpdateContactDto {
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
  @MaxLength(40)
  mobilePhone?: string;

  @IsOptional()
  @Transform(emptyOrPartialEmail)
  @ValidateIf((_, value) => typeof value === 'string' && value.includes('@'))
  @IsEmail({}, { message: 'Geçerli bir e-posta girin veya boş bırakın' })
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;

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
  @IsObject()
  customFields?: Record<string, string>;
}

export class RestrictContactDto {
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
  @MaxLength(2000)
  notes?: string;

  @IsIn([ContactStatus.BLACKLIST, ContactStatus.SMS_BLOCKED])
  status: ContactStatus;
}
