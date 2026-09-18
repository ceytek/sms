import { IsBoolean } from 'class-validator';

export class UpdateCompanyServiceDto {
  @IsBoolean()
  isActive: boolean;
}
