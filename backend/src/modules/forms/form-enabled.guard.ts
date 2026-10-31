import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { FormAccessService } from './services/form-access.service.js';

@Injectable()
export class FormEnabledGuard implements CanActivate {
  constructor(private readonly access: FormAccessService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    await this.access.assertEnabled(request.user);
    return true;
  }
}
