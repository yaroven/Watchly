import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { Logger, LoggerErrorInterceptor } from "nestjs-pino";
import { collectDefaultMetrics } from "prom-client";
import { AppModule } from "./app/app.module";
import { DEV_DEFAULTS } from "./common/dev-defaults.const";
import { requireInProduction } from "./common/utils/env.util";
import { httpMetricsMiddleware } from "./services/metrics/http-metrics.middleware";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableShutdownHooks();

  // Heap, event loop lag, GC. Once per process, on the default registry the
  // metrics controller serves; a second call would throw on duplicate names.
  collectDefaultMetrics();
  app.use(httpMetricsMiddleware());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.use(cookieParser());

  app.useLogger(app.get(Logger));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  app.use(helmet());

  const corsAllowedOrigins = requireInProduction(
    process.env.CORS_ALLOWED_ORIGINS,
    "CORS_ALLOWED_ORIGINS",
    DEV_DEFAULTS.CORS_ALLOWED_ORIGINS,
  );
  const allowedOrigins = corsAllowedOrigins.split(",").map((origin) => origin.trim());
  app.enableCors({ origin: allowedOrigins, credentials: true });

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Watchly API")
    .setDescription("Titles, seasons, episodes, and video transcoding pipeline")
    .setVersion("1.0")
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, swaggerDocument);

  await app.listen(process.env.PORT ?? 3000, "0.0.0.0");
}

void bootstrap();
