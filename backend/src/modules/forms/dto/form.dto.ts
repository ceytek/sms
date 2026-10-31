import { Type } from 'class-transformer';
import {
  Allow,
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { FORM_FIELD_TYPES, SUBMISSION_STATUSES, TEMPLATE_CATEGORIES } from '../form.constants.js';

export class FormFieldOptionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label: string;

  @IsInt()
  @Min(0)
  position: number;
}

export class FormFieldDto {
  @IsOptional()
  @IsUUID('4')
  id?: string;

  @IsIn(FORM_FIELD_TYPES)
  type: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  label: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  placeholder?: string;

  @IsBoolean()
  required: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  defaultValue?: string;

  @IsInt()
  @Min(0)
  position: number;

  @IsOptional()
  @Allow()
  validation?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormFieldOptionDto)
  options?: FormFieldOptionDto[];
}

export class SaveFieldsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields: FormFieldDto[];
}

export class UpsertFormDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyNameOverride?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  thankYouMessage?: string;

  @IsOptional()
  @IsBoolean()
  personalized?: boolean;

  @IsOptional()
  @IsBoolean()
  singleSubmission?: boolean;

  @IsOptional()
  @IsBoolean()
  allowEdit?: boolean;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000000)
  maxSubmissions?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  smsBody?: string;

  @IsOptional()
  @IsUUID('4')
  originatorId?: string;

  @IsOptional()
  @Allow()
  audience?: Record<string, unknown>;
}

export class FormSourceDto {
  @IsIn(['CONTACT_GROUP', 'CONTACT_PICK', 'CONTACT_BOOK', 'MANUAL', 'FILE', 'TAG'])
  type: 'CONTACT_GROUP' | 'CONTACT_PICK' | 'CONTACT_BOOK' | 'MANUAL' | 'FILE' | 'TAG';

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
  @IsArray()
  @IsUUID('4', { each: true })
  contactIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100000)
  @IsString({ each: true })
  phones?: string[];
}

export class DistributeFormDto {
  @IsUUID('4')
  originatorId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  body: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormSourceDto)
  sources?: FormSourceDto[];
}

export class CreateFormTemplateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsIn(TEMPLATE_CATEGORIES)
  category: string;

  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields: FormFieldDto[];
}

export class UpdateSubmissionStatusDto {
  @IsIn(SUBMISSION_STATUSES)
  status: string;
}

export class SubmitFormDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sessionKey?: string;

  @IsOptional()
  @IsIn(['PUBLIC', 'QR', 'SMS'])
  channel?: 'PUBLIC' | 'QR' | 'SMS';

  @Allow()
  data: Record<string, unknown>;
}

export class SubmissionQueryDto {
  @IsOptional()
  @IsUUID('4')
  formId?: string;

  @IsOptional()
  @IsIn(SUBMISSION_STATUSES)
  status?: string;

  @IsOptional()
  @IsIn(['PUBLIC', 'QR', 'SMS'])
  channel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsIn(['csv', 'xlsx'])
  format?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  ids?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
