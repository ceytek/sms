import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { NotificationsService } from './notifications.service.js';
import { SendAccountCredentialsDto } from './dto/send-account-credentials.dto.js';

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DEALER)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('account-credentials/status')
  credentialsNotifyStatus(
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.notificationsService.credentialsNotifyStatus(user);
  }

  @Post('account-credentials')
  sendAccountCredentials(
    @Body() dto: SendAccountCredentialsDto,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.notificationsService.sendAccountCredentials(dto, user);
  }
}
