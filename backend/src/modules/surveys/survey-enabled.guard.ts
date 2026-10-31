import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { SurveyAccessService } from './services/survey-access.service.js';

@Injectable()
export class SurveyEnabledGuard implements CanActivate {
  constructor(private readonly access: SurveyAccessService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    await this.access.assertEnabled(request.user);
    return true;
  }
}
