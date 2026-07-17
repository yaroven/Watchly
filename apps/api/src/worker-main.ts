import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { VideoTranscoderWorkerModule } from "./video-transcoder/video-transcoder-worker.module";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(VideoTranscoderWorkerModule, {
    bufferLogs: true,
  });
  app.enableShutdownHooks();
  app.useLogger(app.get(Logger));
}

void bootstrap();
