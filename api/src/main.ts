import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );

  app.useLogger(app.get(Logger));

  app.enableCors("*");
  await app.listen(process.env.PORT ?? 3000, "0.0.0.0");
}

void bootstrap();
