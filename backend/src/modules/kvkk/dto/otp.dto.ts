import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SendKvkkOtpDto {
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

export class VerifyKvkkOtpDto {
  @IsString()
  challengeId: string;

  @IsString()
  @MaxLength(12)
  code: string;
}
