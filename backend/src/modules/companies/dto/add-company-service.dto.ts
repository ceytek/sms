import { IsUUID } from 'class-validator';

export class AddCompanyServiceDto {
  @IsUUID()
  serviceId: string;
}
