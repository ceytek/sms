import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { DocumentStatus } from '../../../common/enums/document-status.enum.js';

export class UpdateCompanyDocumentDto {
  @IsOptional()
  @IsUUID('4')
  id?: string;

  @IsOptional()
  @IsUUID('4')
  documentTypeId?: string;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  missingDescription?: string;
}

export class CreateCustomDocumentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name: string;
}
