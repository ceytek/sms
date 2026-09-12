import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Role } from '../../common/enums/role.enum.js';
import { MapService } from './map.service.js';

@Controller('admin/map')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN, Role.DEALER)
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Get('points')
  findPoints(@Request() req: { user: { id: string; role: string; companyId: string } }) {
    return this.mapService.findPoints(req.user);
  }
}
