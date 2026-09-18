import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ContactCustomFieldType } from '../../../common/enums/contact-custom-field-type.enum.js';

export class CreateContactCustomFieldDto {
  @IsString()
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsEnum(ContactCustomFieldType)
  fieldType?: ContactCustomFieldType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateContactCustomFieldDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsEnum(ContactCustomFieldType)
  fieldType?: ContactCustomFieldType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
