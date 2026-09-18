import { Controller, Get, Param, ParseUUIDPipe, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { KvkkSettingsService } from './services/kvkk-settings.service.js';

@Controller('public/kvkk/branding')
export class KvkkPublicBrandingController {
  constructor(private readonly settingsService: KvkkSettingsService) {}

  @Get(':ownerCompanyId/logo')
  async logo(
    @Param('ownerCompanyId', ParseUUIDPipe) ownerCompanyId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.settingsService.openPublicLogo(ownerCompanyId);
    res.set({
      'Content-Type': file.mime,
      'Cache-Control': 'public, max-age=300',
      'Content-Disposition': `inline; filename="${encodeURIComponent(file.fileName)}"`,
    });
    return new StreamableFile(file.stream);
  }
}
