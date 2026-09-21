import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { OriginatorRestrictionType } from '../../../common/enums/originator-restriction-type.enum.js';

export class OriginatorRestrictionQueryDto {
  @IsEnum(OriginatorRestrictionType)
  type: OriginatorRestrictionType;

  @IsOptional()
  @IsUUID('4')
  originatorId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;
}

export class CreateOriginatorRestrictionDto {
  @IsUUID('4')
  originatorId: string;

  @IsEnum(OriginatorRestrictionType)
  type: OriginatorRestrictionType;

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
}

export class BulkOriginatorRestrictionDto {
  @IsUUID('4')
  originatorId: string;

  @IsEnum(OriginatorRestrictionType)
  type: OriginatorRestrictionType;

  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  numbers: string[];
}
