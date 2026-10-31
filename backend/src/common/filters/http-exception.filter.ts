import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { humanizeValidationMessages } from '../validation-message.js';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body =
      exception instanceof HttpException ? exception.getResponse() : 'Beklenmeyen bir hata oluştu. Tekrar deneyin.';
    const extracted = typeof body === 'string' ? body : (body as { message?: unknown }).message || body;
    const message =
      status >= 500
        ? 'Beklenmeyen bir hata oluştu. Tekrar deneyin.'
        : status === 400
          ? humanizeValidationMessages(extracted)
          : typeof extracted === 'string'
            ? extracted
            : humanizeValidationMessages(extracted);

    this.logger.error(
      `${request.method} ${request.url} - ${status}`,
      exception instanceof Error ? exception.stack : '',
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
