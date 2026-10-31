import { Body, Controller, Get, Param, Post, Req, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { SubmitFormDto } from './dto/form.dto.js';
import { FormPublicService } from './services/form-public.service.js';

@Controller('forms/public')
export class FormPublicController {
  constructor(private readonly forms: FormPublicService) {}

  @Get('f/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.forms.bySlug(slug);
  }

  @Get('fr/:token')
  byToken(@Param('token') token: string) {
    return this.forms.byToken(token);
  }

  @Post('f/:slug/submissions')
  @UseInterceptors(FilesInterceptor('files', 10, { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  submitSlug(
    @Param('slug') slug: string,
    @Body() dto: SubmitFormDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    return this.forms.submit(null, slug, dto, files, req.ip);
  }

  @Post('fr/:token/submissions')
  @UseInterceptors(FilesInterceptor('files', 10, { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  submitToken(
    @Param('token') token: string,
    @Body() dto: SubmitFormDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    return this.forms.submit(token, null, dto, files, req.ip);
  }
}
