import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { SmsCampaignService } from './services/sms-campaign.service.js';
import { CreateSmsCampaignDto } from './dto/create-sms-campaign.dto.js';
import { CheckRestrictedPhonesDto } from './dto/check-restricted-phones.dto.js';
import { SaveSmsTemplateDto } from './dto/save-sms-template.dto.js';
import { SmsQueueService } from './queue/sms-queue.service.js';
import { DataSource } from 'typeorm';
import { SmsCampaign } from './entities/sms-campaign.entity.js';

@Controller('messaging')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER, Role.DEALER, Role.ADMIN)
export class SmsMessagingController {
  constructor(
    private readonly campaigns: SmsCampaignService,
    private readonly dataSource: DataSource,
  ) {}

  @Get('originators')
  originators(@CurrentUser() user: { id: string; role: string; companyId: string }) {
    return this.campaigns.originators(user);
  }

  @Get('templates')
  templates(@CurrentUser() user: { id: string; role: string; companyId: string }) {
    return this.campaigns.templates(user);
  }

  @Post('templates')
  saveTemplate(
    @Body() body: SaveSmsTemplateDto,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.campaigns.saveTemplate(user, body.name, body.body);
  }

  @Patch('templates/:id')
  updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SaveSmsTemplateDto,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.campaigns.updateTemplate(id, user, body.name, body.body);
  }

  @Delete('templates/:id')
  deleteTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.campaigns.deleteTemplate(id, user);
  }

  @Get('campaigns')
  list(
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('search') search: string | undefined,
    @Query('status') status: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.campaigns.list(user, {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      search,
      status,
      from,
      to,
    });
  }

  @Post('campaigns')
  create(
    @Body() dto: CreateSmsCampaignDto,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.campaigns.create(dto, user);
  }

  @Post('campaigns/check-restricted')
  checkRestricted(
    @Body() dto: CheckRestrictedPhonesDto,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.campaigns.previewRestricted(dto, user);
  }

  @Get('campaigns/:id')
  getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.campaigns.progress(id, user);
  }

  @Get('campaigns/:id/progress')
  progress(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.campaigns.progress(id, user);
  }

  @Get('campaigns/:id/recipients')
  recipients(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status: string | undefined,
    @Query('excludeReason') excludeReason: string | undefined,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.campaigns.recipients(id, user, status, Number(page) || 1, Number(limit) || 50, excludeReason);
  }

  @Get('campaigns/:id/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async export(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status: string | undefined,
    @CurrentUser() user: { id: string; role: string; companyId: string },
    @Res() res: Response,
  ) {
    const csv = await this.campaigns.exportCsv(id, user, status);
    res.setHeader('Content-Disposition', `attachment; filename="sms-${id}.csv"`);
    res.send(csv);
  }

  @Post('campaigns/:id/file')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }))
  async uploadFile(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: { originalname: string; buffer: Buffer },
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    const campaign = await this.campaigns.progress(id, user);
    const dir = join(process.cwd(), 'uploads', 'sms-imports');
    await mkdir(dir, { recursive: true });
    const path = join(dir, `${id}-${Date.now()}-${file.originalname}`);
    await writeFile(path, file.buffer);
    await this.dataSource.getRepository(SmsCampaign).update({ id: campaign.id }, { filePath: path });
    await this.campaigns.startPrepare(id, user);
    return { ok: true, fileName: file.originalname };
  }

  @Post('campaigns/:id/prepare')
  startPrepare(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.campaigns.startPrepare(id, user);
  }

  @Post('campaigns/:id/confirm')
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.campaigns.confirm(id, user);
  }

  @Post('campaigns/:id/cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.campaigns.cancel(id, user);
  }

  @Post('campaigns/:id/retry')
  retry(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.campaigns.retryDead(id, user);
  }
}

@Controller('messaging')
export class SmsHealthController {
  constructor(private readonly queue: SmsQueueService) {}

  @Get('health')
  async health() {
    try {
      const depth = await this.queue.depth();
      return { ok: true, redis: true, queue: depth };
    } catch {
      return { ok: false, redis: false };
    }
  }
}

@Controller('webhooks/sms')
export class SmsWebhookController {
  constructor(private readonly queue: SmsQueueService) {}

  @Post('delivery')
  async delivery(@Body() body: Record<string, unknown>, @Query('token') token?: string) {
    const expected = process.env.SMS_WEBHOOK_TOKEN;
    if (expected && token !== expected) {
      return { ok: false };
    }
    await this.queue.enqueueCallback(body);
    return { ok: true };
  }
}
