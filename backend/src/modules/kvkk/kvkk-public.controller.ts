import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { KvkkPublicService } from './services/kvkk-public.service.js';
import { SubmitPublicKvkkFormDto } from './dto/form.dto.js';

@Controller('public/kvkk')
export class KvkkPublicController {
  constructor(private readonly publicService: KvkkPublicService) {}

  @Get(':token')
  load(@Param('token') token: string) {
    return this.publicService.load(token);
  }

  @Post(':token')
  submit(@Param('token') token: string, @Body() dto: SubmitPublicKvkkFormDto) {
    return this.publicService.submit(token, dto);
  }
}
