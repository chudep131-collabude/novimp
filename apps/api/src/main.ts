import dns from 'node:dns';
// Force Node 18+ fetch to prefer IPv4. VPNs often break IPv6 routing, causing fetch to silently timeout.
dns.setDefaultResultOrder('ipv4first');

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { LoggerService } from './common/logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);
  app.useLogger(logger);

  // Security
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));
  app.use(compression());

  // CORS
  const frontendUrl = configService.get('FRONTEND_URL') || 'http://localhost:3000';
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [frontendUrl]
    : [frontendUrl, 'http://localhost:3000', 'http://localhost:3001'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
  });

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global interceptors & filters
  app.useGlobalInterceptors(new RequestIdInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter(logger));

  // Swagger
  if (configService.get('NODE_ENV') !== 'production') {
    const { SwaggerModule, DocumentBuilder } = await import('@nestjs/swagger');
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Marketplace API')
      .setDescription('Premium Digital Services Reseller Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get('API_PORT', 4000);
  await app.listen(port);
  logger.log(`API running on port ${port}`, 'Bootstrap');
}

bootstrap();
