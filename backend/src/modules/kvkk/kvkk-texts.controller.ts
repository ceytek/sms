import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { KvkkEnabledGuard } from './kvkk-enabled.guard.js';
import { KvkkTextsService } from './services/kvkk-texts.service.js';
import { CreateKvkkTextDto, PublishKvkkTextVersionDto, UpdateKvkkTextDocumentDto } from './dto/text.dto.js';
import type { KvkkActor } from './services/kvkk-access.service.js';

@Controller('kvkk/texts')
@UseGuards(JwtAuthGuard, RolesGuard, KvkkEnabledGuard)
@Roles(Role.CUSTOMER)
export class KvkkTextsController {
  constructor(private readonly textsService: KvkkTextsService) {}

  @Get()
  list(@CurrentUser() user: KvkkActor) {
    return this.textsService.list(user);
  }

  @Post()
  create(@Body() dto: CreateKvkkTextDto, @CurrentUser() user: KvkkActor) {
    return this.textsService.create(dto, user);
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: KvkkActor) {
    return this.textsService.getOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKvkkTextDocumentDto,
    @CurrentUser() user: KvkkActor,
  ) {
    return this.textsService.updateDocument(id, dto, user);
  }

  @Post(':id/versions')
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishKvkkTextVersionDto,
    @CurrentUser() user: KvkkActor,
  ) {
    return this.textsService.publishVersion(id, dto, user);
  }
}
