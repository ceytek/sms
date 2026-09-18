import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateKvkkTextDto {
  @IsString()
  @MaxLength(160)
  name: string;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  bodyHtml: string;
}

export class PublishKvkkTextVersionDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  bodyHtml: string;
}

export class UpdateKvkkTextDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;
}
