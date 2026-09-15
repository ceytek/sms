import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { DocumentsService } from './documents.service.js';
import { CreateCustomDocumentDto, UpdateCompanyDocumentDto } from './dto/company-document.dto.js';

@Controller('admin/companies/:companyId/documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DEALER)
export class CompanyDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  list(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.documentsService.getCompanyDocuments(companyId, user);
  }

  @Post('custom')
  createCustom(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateCustomDocumentDto,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.documentsService.createCustomDocument(companyId, dto, user);
  }

  @Patch()
  update(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: UpdateCompanyDocumentDto,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.documentsService.updateCompanyDocument(companyId, dto, user);
  }

  @Post('complete')
  complete(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.documentsService.completeProcess(companyId, user);
  }

  @Post('file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  upload(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query('documentId') documentId: string | undefined,
    @Query('documentTypeId') documentTypeId: string | undefined,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.documentsService.uploadFile(companyId, documentId, documentTypeId, file, user);
  }

  @Get(':documentId/file')
  async download(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: { id: string; role: string; companyId: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.documentsService.openFile(companyId, documentId, user);
    res.set({
      'Content-Type': file.mime,
      'Content-Disposition': `inline; filename="${encodeURIComponent(file.fileName)}"`,
    });
    return new StreamableFile(file.stream);
  }

  @Delete(':documentId/file')
  deleteFile(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.documentsService.deleteFile(companyId, documentId, user);
  }

  @Delete(':documentId')
  removeCustom(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.documentsService.deleteCustomDocument(companyId, documentId, user);
  }
}
