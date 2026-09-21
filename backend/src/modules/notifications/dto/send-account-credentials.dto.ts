import { IsEnum, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { NotificationChannel } from '../../../common/enums/notification-channel.enum.js';

export class SendAccountCredentialsDto {
  @IsUUID('4')
  companyId: string;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;
}
