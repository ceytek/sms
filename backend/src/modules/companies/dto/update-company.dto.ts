import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CompanyType } from '../../../common/enums/company-type.enum.js';
import {
  CreateContactDto,
  CreateCreditAlertDto,
  CreateCompanyServiceDto,
  CreateIysDto,
  CreateNoteDto,
  CreateOriginatorDto,
  CreateSecurityDto,
  CreateSmsAccountDto,
} from './create-company.dto.js';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsEnum(CompanyType)
  companyType?: CompanyType;

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
  @MaxLength(20)
  taxNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(11)
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
