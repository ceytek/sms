import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { ContactImportService } from './services/contact-import.service.js';
import {
  BulkNumbersDto,
  CompanySourceQueryDto,
  ImportAnalyzeDto,
  ImportCommitDto,
  ImportFromCompaniesDto,
} from './dto/import.dto.js';
import type { ContactActor } from './services/contact-access.service.js';

@Controller('contact-imports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
export class ContactImportsController {
  constructor(private readonly importService: ContactImportService) {}

  @Get()
  list(@CurrentUser() user: ContactActor) {
    return this.importService.listJobs(user);
  }

  @Get('company-sources')
  companySources(@Query() query: CompanySourceQueryDto, @CurrentUser() user: ContactActor) {
    return this.importService.listCompanySources(query, user);
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: ContactActor) {
    return this.importService.getJob(id, user);
  }

  @Post('preview')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  previewFile(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: ContactActor) {
    return this.importService.previewFile(file, user);
  }

  @Post('analyze')
  analyze(@Body() dto: ImportAnalyzeDto, @CurrentUser() user: ContactActor) {
    return this.importService.analyze(dto, user);
  }

  @Post('commit')
  commit(@Body() dto: ImportCommitDto, @CurrentUser() user: ContactActor) {
    return this.importService.commit(dto, user);
  }

  @Post('bulk-preview')
  bulkPreview(@Body() dto: BulkNumbersDto, @CurrentUser() user: ContactActor) {
    return this.importService.previewBulk(dto, user);
  }

  @Post('from-companies/preview')
  fromCompaniesPreview(@Body() dto: ImportFromCompaniesDto, @CurrentUser() user: ContactActor) {
    return this.importService.previewCompanies(dto, user);
  }
}
