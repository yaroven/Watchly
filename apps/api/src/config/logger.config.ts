import { registerAs } from "@nestjs/config";
import { Params } from "nestjs-pino";

export const LoggerConfigName = "logger";

export interface LoggerConfig {
  level: string;
  lokiUrl?: string;
  pretty: boolean;
}

export default registerAs(LoggerConfigName, (): LoggerConfig => ({
  level: process.env.LOG_LEVEL ?? "info",
  lokiUrl: process.env.LOKI_URL,
  pretty: process.env.NODE_ENV !== "production" && Boolean(process.stdout.isTTY),
}));

export function buildLoggerParams(config: LoggerConfig, service: string): Params {
  const { level, lokiUrl, pretty } = config;

  const stdout = pretty
    ? { target: "pino-pretty", level, options: { colorize: true } }
    : { target: "pino/file", level, options: { destination: 1 } };

  const targets = lokiUrl
    ? [
        stdout,
        {
          target: "pino-loki",
          level,
          options: {
            host: lokiUrl,
            labels: { app: "watchly", service },
            batching: { interval: 2 },
            structuredMetaKey: false,
          },
        },
      ]
    : [stdout];

  return { pinoHttp: { level, transport: { targets } } };
}
