import { IsString, MaxLength, MinLength } from 'class-validator';

export class SaveSmsTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body: string;
}
