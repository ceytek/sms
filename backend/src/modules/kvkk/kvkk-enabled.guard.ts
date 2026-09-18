import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { KvkkAccessService } from './services/kvkk-access.service.js';

@Injectable()
export class KvkkEnabledGuard implements CanActivate {
  constructor(private readonly access: KvkkAccessService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    await this.access.assertEnabled(request.user);
    return true;
  }
}
