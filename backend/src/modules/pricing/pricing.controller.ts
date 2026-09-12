import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PricingService } from './pricing.service.js';
import { CreatePriceListDto } from './dto/create-price-list.dto.js';
import { UpdatePriceListDto } from './dto/update-price-list.dto.js';
import { BulkUpdatePriceListItemsDto } from './dto/price-list-item.dto.js';
import { AssignPriceListDto } from './dto/assign-price-list.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';

@Controller('admin/pricing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DEALER)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('lists')
  findAllLists(
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.pricingService.findAllLists(user);
  }

  @Post('lists')
  createList(
    @Body() dto: CreatePriceListDto,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.pricingService.createList(dto, user);
  }

  @Patch('lists/:id')
  updateList(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePriceListDto,
  ) {
    return this.pricingService.updateList(id, dto);
  }

  @Get('lists/:id/items')
  findListItems(@Param('id', ParseUUIDPipe) id: string) {
    return this.pricingService.findListItems(id);
  }

  @Put('lists/:id/items')
  bulkUpdateItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BulkUpdatePriceListItemsDto,
  ) {
    return this.pricingService.bulkUpdateItems(id, dto.items);
  }

  @Get('lists/:id/assignments')
  findListAssignments(@Param('id', ParseUUIDPipe) id: string) {
    return this.pricingService.findListAssignments(id);
  }

  @Post('assign')
  assignPriceList(
    @Body() dto: AssignPriceListDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.pricingService.assignPriceList(
      dto.companyId,
      dto.priceListId,
      user.id,
    );
  }
}
