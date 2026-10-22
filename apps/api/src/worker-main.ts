import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { WorkerModule } from "./worker/worker.module";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });
  app.enableShutdownHooks();
  app.useLogger(app.get(Logger));
}

void bootstrap();
