import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateKvkkSettingsDto {
  @IsOptional()
  @IsBoolean()
  smsConsentCheckEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyDisplayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  contactInfo?: string;
}
