import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { KvkkEnabledGuard } from './kvkk-enabled.guard.js';
import { KvkkOtpService } from './services/kvkk-otp.service.js';
import { SendKvkkOtpDto, VerifyKvkkOtpDto } from './dto/otp.dto.js';
import type { KvkkActor } from './services/kvkk-access.service.js';

@Controller('kvkk/otp')
@UseGuards(JwtAuthGuard, RolesGuard, KvkkEnabledGuard)
@Roles(Role.CUSTOMER)
export class KvkkOtpController {
  constructor(private readonly otpService: KvkkOtpService) {}

  @Post('send')
  send(@Body() dto: SendKvkkOtpDto, @CurrentUser() user: KvkkActor) {
    return this.otpService.send(dto, user);
  }

  @Post('verify')
  verify(@Body() dto: VerifyKvkkOtpDto, @CurrentUser() user: KvkkActor) {
    return this.otpService.verify(dto, user);
  }
}
