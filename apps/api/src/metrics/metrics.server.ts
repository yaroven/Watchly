import { LoggerService } from "@nestjs/common";
import { createServer, Server } from "node:http";
import { Registry } from "prom-client";

const CONTEXT = "MetricsServer";

/**
 * Scrape endpoint on a port of its own, deliberately not the application port.
 *
 * Two reasons it is separate. `worker-main.ts` builds an application context
 * with no HTTP server at all, so the worker has nowhere else to expose this;
 * and the api's port is published through the Ingress, which would put route
 * names and queue depths on the public internet.
 *
 * Never fatal. A metrics port that cannot bind — two processes sharing one
 * port in local development is the usual case — must not take the service
 * down with it.
 */
export function startMetricsServer(
  registry: Registry,
  port: number,
  logger: LoggerService,
): Server {
  const server = createServer((req, res) => {
    const path = (req.url ?? "").split("?")[0];

    if (path !== "/metrics") {
      res.writeHead(404).end();
      return;
    }

    registry
      .metrics()
      .then((body) => {
        res.writeHead(200, { "Content-Type": registry.contentType });
        res.end(body);
      })
      .catch((error: unknown) => {
        logger.error?.("Failed to collect metrics", error, CONTEXT);
        res.writeHead(500).end();
      });
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    logger.error?.(
      `Metrics server could not listen on ${port} (${error.code ?? error.message}) — carrying on without it`,
      CONTEXT,
    );
  });

  server.listen(port, "0.0.0.0", () => {
    logger.log?.(`Metrics on :${port}/metrics`, CONTEXT);
  });

  return server;
}
