import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { LoggerService } from '../logger/logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const requestId = request.requestId || 'unknown';
    const isProduction = process.env.NODE_ENV === 'production';

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    this.logger.error(
      `Exception: ${JSON.stringify(message)}`,
      exception instanceof Error ? exception.stack : undefined,
      'AllExceptionsFilter',
    );

    const responseBody: Record<string, unknown> = {
      statusCode: status,
      message: status === HttpStatus.INTERNAL_SERVER_ERROR
        ? 'An unexpected error occurred'
        : message,
      requestId,
      timestamp: new Date().toISOString(),
    };

    // Omit internal path from production responses to avoid leaking routing info
    if (!isProduction) {
      responseBody.path = request.url;
    }

    response.status(status).json(responseBody);
  }
}

