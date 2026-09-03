import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ObservabilityService } from './observability/observability.service';
import { createRequestTelemetry } from './observability/request-telemetry';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  const port = Number(process.env.PORT ?? 4000);
  const origins = (process.env.APP_ORIGIN ?? 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'no-referrer' },
      strictTransportSecurity:
        process.env.NODE_ENV === 'production'
          ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
          : false,
    }),
  );
  app.use(createRequestTelemetry(app.get(ObservabilityService)));
  app.enableCors({ origin: origins, credentials: true });
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
