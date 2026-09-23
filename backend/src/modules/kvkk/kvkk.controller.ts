import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { KvkkEnabledGuard } from './kvkk-enabled.guard.js';
import { KvkkAccessService, type KvkkActor } from './services/kvkk-access.service.js';
import { KvkkSettingsService } from './services/kvkk-settings.service.js';
import { UpdateKvkkSettingsDto } from './dto/settings.dto.js';
import { KvkkDashboardQueryDto } from './dto/consent.dto.js';

@Controller('kvkk')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
export class KvkkController {
  constructor(
    private readonly access: KvkkAccessService,
    private readonly settingsService: KvkkSettingsService,
  ) {}

  @Get('status')
  async status(@CurrentUser() user: KvkkActor) {
    const ownerCompanyId = this.access.ownerCompanyId(user);
    const assignment = await this.access.findAssignment(ownerCompanyId);
    const term = this.access.serializeTerm(assignment);
    const enabled = Boolean(assignment?.isActive) && !term?.expired;
    if (!enabled) return { enabled: false, term };
    const settings = await this.settingsService.get(user);
    return { enabled: true, smsConsentCheckEnabled: settings.smsConsentCheckEnabled, term };
  }

  @Get('dashboard')
  @UseGuards(KvkkEnabledGuard)
  dashboard(@Query() query: KvkkDashboardQueryDto, @CurrentUser() user: KvkkActor) {
    return this.settingsService.dashboard(query, user);
  }

  @Get('settings')
  @UseGuards(KvkkEnabledGuard)
  getSettings(@CurrentUser() user: KvkkActor) {
    return this.settingsService.get(user);
  }

  @Patch('settings')
  @UseGuards(KvkkEnabledGuard)
  updateSettings(@Body() dto: UpdateKvkkSettingsDto, @CurrentUser() user: KvkkActor) {
    return this.settingsService.update(dto, user);
  }

  @Post('settings/logo')
  @UseGuards(KvkkEnabledGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadLogo(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: KvkkActor) {
    return this.settingsService.uploadLogo(file, user);
  }
}
