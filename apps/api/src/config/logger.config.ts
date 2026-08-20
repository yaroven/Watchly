import { registerAs } from "@nestjs/config";
import { Params } from "nestjs-pino";

export const LoggerConfigName = "logger";

export interface LoggerConfig {
  level: string;
  /** Unset means "no Loki running" — logs then go to stdout only. */
  lokiUrl?: string;
  pretty: boolean;
}

export default registerAs(LoggerConfigName, (): LoggerConfig => ({
  level: process.env.LOG_LEVEL ?? "info",
  lokiUrl: process.env.LOKI_URL,
  // Pretty-printing is driven by the terminal rather than NODE_ENV: inside a
  // container stdout is not a TTY, so logs stay newline-delimited JSON — the
  // format both Loki and `docker compose logs` want — while a local `pnpm dev`
  // run in a terminal still gets colourised output.
  //
  // NODE_ENV only vetoes it, so that pino never tries to load pino-pretty in
  // production. It is a devDependency: it happens to reach the runtime image
  // today (the Dockerfile copies node_modules wholesale, without pruning), but
  // a `pnpm prune --prod` there would otherwise crash any prod process started
  // with a TTY — `docker run -it`, or an orchestrator with tty: true.
  pretty: process.env.NODE_ENV !== "production" && Boolean(process.stdout.isTTY),
}));

/**
 * Build the pino transport targets for one service.
 *
 * Logs are pushed to Loki by the process itself, so no log-shipping agent sits
 * in between. The Loki target is dropped when no URL is configured, which keeps
 * the app runnable without the observability stack.
 */
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
            // pino-loki already derives `level` and `hostname` labels on its own.
            labels: { app: "watchly", service },
            batching: { interval: 2 },
            // Loki runs schema v11 with allow_structured_metadata disabled, so a
            // push carrying structured metadata would be rejected outright.
            structuredMetaKey: false,
          },
        },
      ]
    : [stdout];

  return { pinoHttp: { level, transport: { targets } } };
}
