import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { Registry } from "prom-client";
import { MetricsConfig, MetricsConfigName } from "./config/metrics.config";
import { METRICS_REGISTRY } from "./metrics/metrics.const";
import { startMetricsServer } from "./metrics/metrics.server";
import { VideoTranscoderWorkerModule } from "./video-transcoder/video-transcoder-worker.module";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(VideoTranscoderWorkerModule, {
    bufferLogs: true,
  });
  app.enableShutdownHooks();

  const logger = app.get(Logger);
  app.useLogger(logger);

  const metrics = app.get(ConfigService).getOrThrow<MetricsConfig>(MetricsConfigName);
  startMetricsServer(app.get<Registry>(METRICS_REGISTRY), metrics.port, logger);
}

void bootstrap();
