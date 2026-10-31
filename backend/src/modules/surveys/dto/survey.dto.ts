import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  Allow,
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
import { SURVEY_QUESTION_TYPES, TEMPLATE_CATEGORIES } from '../survey.constants.js';

export class ShowWhenDto {
  @IsUUID('4')
  questionId: string;

  @IsOptional()
  @IsUUID('4')
  optionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  value?: string;
}

export class SurveyOptionDto {
  @IsOptional()
  @IsUUID('4')
  id?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label: string;

  @IsInt()
  @Min(0)
  position: number;
}

export class SurveyQuestionDto {
  @IsOptional()
  @IsUUID('4')
  id?: string;

  @IsIn(SURVEY_QUESTION_TYPES)
  type: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsBoolean()
  required: boolean;

  @IsInt()
  @Min(0)
  position: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ShowWhenDto)
  showWhen?: ShowWhenDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SurveyOptionDto)
  options?: SurveyOptionDto[];
}

export class CreateTemplateDto {
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
  @Type(() => SurveyQuestionDto)
  questions: SurveyQuestionDto[];
}

export class SaveQuestionsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SurveyQuestionDto)
  questions: SurveyQuestionDto[];
}

export class UpsertSurveyDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  formTitle?: string;

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
  anonymous?: boolean;

  @IsOptional()
  @IsBoolean()
  personalized?: boolean;

  @IsOptional()
  @IsBoolean()
  singleResponse?: boolean;

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

export class SurveySourceDto {
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

export class DistributeSurveyDto {
  @IsUUID('4')
  originatorId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  body: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SurveySourceDto)
  sources?: SurveySourceDto[];

  @IsOptional()
  @IsBoolean()
  send?: boolean;
}

export class PublishSurveyDto {
  @IsOptional()
  @IsBoolean()
  send?: boolean;
}

export class UpdateSurveySettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  defaultThankYou?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  defaultSmsBody?: string;
}

export class PublicAnswerDto {
  @IsUUID('4')
  questionId: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  optionIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  text?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  number?: number;
}

export class SubmitSurveyDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sessionKey?: string;

  @IsOptional()
  @IsIn(['PUBLIC', 'QR', 'SMS'])
  channel?: 'PUBLIC' | 'QR' | 'SMS';

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PublicAnswerDto)
  answers: PublicAnswerDto[];
}

export class StartSurveyDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sessionKey?: string;

  @IsOptional()
  @IsIn(['PUBLIC', 'QR', 'SMS'])
  channel?: 'PUBLIC' | 'QR' | 'SMS';
}

export class ResponseQueryDto {
  @IsOptional()
  @IsUUID('4')
  surveyId?: string;

  @IsOptional()
  @IsIn(['PARTIAL', 'SENT', 'DELIVERED', 'OPENED', 'STARTED', 'COMPLETED', 'FAILED', 'CANCELLED'])
  status?: string;

  @IsOptional()
  @IsIn(['SMS', 'PUBLIC', 'QR'])
  channel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  ids?: string;

  @IsOptional()
  @IsIn(['csv', 'xlsx'])
  format?: string;

  @IsOptional()
  @IsUUID('4')
  groupId?: string;

  @IsOptional()
  @IsUUID('4')
  tagId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

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
