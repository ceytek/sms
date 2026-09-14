import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBannedOriginatorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(11)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
