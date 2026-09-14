import { IsIn } from 'class-validator';
import { OriginatorStatus } from '../../../common/enums/originator-status.enum.js';

export class UpdateOriginatorStatusDto {
  @IsIn([OriginatorStatus.ACTIVE, OriginatorStatus.PASSIVE])
  status: OriginatorStatus.ACTIVE | OriginatorStatus.PASSIVE;
}
