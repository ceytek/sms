import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateOwnOriginatorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(11)
  name: string;
}
