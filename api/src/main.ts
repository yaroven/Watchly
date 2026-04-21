import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const nodeEnv = process.env.NODE_ENV;
  const app = await NestFactory.create(AppModule, {
    logger:
      nodeEnv === "development"
        ? ["log", "error", "warn", "debug", "verbose"]
        : ["log", "error", "warn"],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );
  app.enableCors("*");
  await app.listen(process.env.PORT ?? 3000, "0.0.0.0");
}

void bootstrap();
