import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CompanyType } from '../../../common/enums/company-type.enum.js';
import { CustomerType } from '../../../common/enums/customer-type.enum.js';
import { ContactType } from '../../../common/enums/contact-type.enum.js';
import { OriginatorStatus } from '../../../common/enums/originator-status.enum.js';
import { NotificationType } from '../../../common/enums/notification-type.enum.js';
import { IpRuleType } from '../../../common/enums/ip-rule-type.enum.js';
import { IysStatus } from '../../../common/enums/iys-status.enum.js';

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsEnum(ContactType)
  contactType: ContactType;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateSmsAccountDto {
  @IsUUID()
  providerId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  subscriberNo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  creditRefundRate?: number;

  @IsOptional()
  @IsInt()
  singleSendLimit?: number;

  @IsOptional()
  @IsBoolean()
  applyToSubAccounts?: boolean;

  @IsOptional()
  @IsBoolean()
  noRouting?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateOriginatorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(11)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  smsAccountIndex?: number;

  @IsOptional()
  @IsUUID()
  smsAccountId?: string;

  @IsOptional()
  @IsEnum(OriginatorStatus)
  status?: OriginatorStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  providerReference?: string;
}

export class CreateCreditAlertDto {
  @IsInt()
  @Min(0)
  threshold: number;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsEnum(NotificationType)
  notificationType?: NotificationType;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateIpRuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  ipAddress: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateSecurityDto {
  @IsOptional()
  @IsEnum(IpRuleType)
  ipRuleType?: IpRuleType;

  @IsOptional()
  @IsString()
  filePassword?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateIpRuleDto)
  ipRules?: CreateIpRuleDto[];
}

export class CreateCompanyServiceDto {
  @IsUUID()
  serviceId: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CreateIysDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  iysCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  brandCode?: string;

  @IsOptional()
  @IsEnum(IysStatus)
  status?: IysStatus;

  @IsOptional()
  @IsString()
  apiKey?: string;
}

export class CreateNoteDto {
  @IsString()
  @IsNotEmpty()
  note: string;

  @IsOptional()
  @IsBoolean()
  showOnOpen?: boolean;
}

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsEnum(CompanyType)
  companyType: CompanyType;

  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  subcategoryId?: string;

  @IsOptional()
  @IsBoolean()
  isSubAccount?: boolean;

  @IsOptional()
  @IsBoolean()
  isDealer?: boolean;

  @IsOptional()
  @IsUUID()
  parentCompanyId?: string;

  @IsOptional()
  @IsUUID()
  dealerCompanyId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  taxOffice?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'Vergi numarası 10 haneli rakam olmalıdır' })
  taxNumber?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{11}$/, { message: 'TC Kimlik No 11 haneli rakam olmalıdır' })
  nationalId?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  serialNumber?: string;

  @IsOptional()
  @IsInt()
  cityId?: number;

  @IsOptional()
  @IsInt()
  districtId?: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobile?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsBoolean()
  showAnnouncement?: boolean;

  @IsOptional()
  @IsBoolean()
  documentsCompleted?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  accountUsername?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  accountPassword?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateContactDto)
  contacts?: CreateContactDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSmsAccountDto)
  smsAccounts?: CreateSmsAccountDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOriginatorDto)
  originators?: CreateOriginatorDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCreditAlertDto)
  creditAlerts?: CreateCreditAlertDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateSecurityDto)
  security?: CreateSecurityDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCompanyServiceDto)
  services?: CreateCompanyServiceDto[];

  @IsOptional()
  @IsUUID()
  priceListId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateIysDto)
  iys?: CreateIysDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateNoteDto)
  notes?: CreateNoteDto[];
}
