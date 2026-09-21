import { Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { InboxService } from './inbox.service.js';
import { InboxQueryDto } from './dto/inbox-query.dto.js';

@Controller('inbox')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DEALER, Role.CUSTOMER)
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Get()
  list(
    @Query() query: InboxQueryDto,
    @CurrentUser() user: { id: string; companyId: string },
  ) {
    return this.inboxService.list(query, user);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: { id: string; companyId: string }) {
    return this.inboxService.unreadCount(user);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: { id: string; companyId: string }) {
    return this.inboxService.markAllRead(user);
  }

  @Patch(':id/read')
  markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; companyId: string },
  ) {
    return this.inboxService.markRead(id, user);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; companyId: string },
  ) {
    return this.inboxService.remove(id, user);
  }
}
