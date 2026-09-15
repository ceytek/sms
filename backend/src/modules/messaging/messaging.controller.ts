import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { MessagingService } from './messaging.service.js';
import { MessagingPreviewDto } from './dto/messaging-preview.dto.js';
import { CreateCampaignDto } from './dto/create-campaign.dto.js';

@Controller('admin/messaging')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DEALER)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post('preview')
  preview(
    @Body() dto: MessagingPreviewDto,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.messagingService.preview(dto, user);
  }

  @Post('campaigns')
  createCampaign(
    @Body() dto: CreateCampaignDto,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.messagingService.createMockCampaign(dto, user);
  }
}
