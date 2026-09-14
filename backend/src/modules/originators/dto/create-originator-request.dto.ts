import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateOriginatorRequestDto {
  @IsUUID()
  companyId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(11)
  name: string;
}
