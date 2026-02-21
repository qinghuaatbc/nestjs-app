import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttp
      ? exception.getResponse()
      : { message: 'Internal server error' };

    let message: string = 'Internal server error';
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const m = (body as { message?: string | string[] }).message;
      message = Array.isArray(m) ? (m[0] || message) : (typeof m === 'string' ? m : message);
    }

    if (status >= 500) {
      this.logger.error(
        `HTTP ${status}: ${message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json({ statusCode: status, message });
  }
}
