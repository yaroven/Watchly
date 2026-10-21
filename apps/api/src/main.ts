import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import { Registry } from "prom-client";
import { AppModule } from "./app.module";
import { DEV_DEFAULTS } from "./common/dev-defaults.const";
import { requireInProduction } from "./common/utils/env.util";
import { MetricsConfig, MetricsConfigName } from "./config/metrics.config";
import { httpMetricsMiddleware } from "./metrics/http-metrics.middleware";
import { METRICS_REGISTRY } from "./metrics/metrics.const";
import { startMetricsServer } from "./metrics/metrics.server";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableShutdownHooks();

  const registry = app.get<Registry>(METRICS_REGISTRY);
  app.use(httpMetricsMiddleware(registry));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.use(cookieParser());

  const logger = app.get(Logger);
  app.useLogger(logger);

  const metrics = app.get(ConfigService).getOrThrow<MetricsConfig>(MetricsConfigName);
  startMetricsServer(registry, metrics.port, logger);

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
