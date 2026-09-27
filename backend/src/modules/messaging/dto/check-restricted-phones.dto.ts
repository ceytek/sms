import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CheckRestrictedPhonesDto {
  @IsUUID('4')
  originatorId: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2000)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  phones?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2000)
  @IsUUID('4', { each: true })
  contactIds?: string[];
}
