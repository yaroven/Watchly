import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { DEV_DEFAULTS } from "./common/dev-defaults.const";
import { requireInProduction } from "./common/env.util";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.use(cookieParser());
  app.useLogger(app.get(Logger));

  app.use(helmet());

  const corsAllowedOrigins = requireInProduction(
    process.env.CORS_ALLOWED_ORIGINS,
    "CORS_ALLOWED_ORIGINS",
    DEV_DEFAULTS.CORS_ALLOWED_ORIGINS,
  );
  const allowedOrigins = corsAllowedOrigins.split(",").map((origin) => origin.trim());
  // credentials: true is required for the browser to accept the response at all when the
  // client sends withCredentials: true (needed to carry the httpOnly refresh-token cookie).
  // Without it, the request still succeeds server-side but the browser silently blocks the
  // response as a CORS violation.
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
