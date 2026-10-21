import { LoggerService } from "@nestjs/common";
import { AddressInfo } from "node:net";
import { Counter, Registry } from "prom-client";
import { startMetricsServer } from "./metrics.server";

function stubLogger(): jest.Mocked<LoggerService> {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  } as unknown as jest.Mocked<LoggerService>;
}

async function get(port: number, path: string): Promise<{ status: number; body: string }> {
  const response = await fetch(`http://127.0.0.1:${port}${path}`);
  return { status: response.status, body: await response.text() };
}

describe("startMetricsServer", () => {
  const servers: ReturnType<typeof startMetricsServer>[] = [];

  function start(registry: Registry, port = 0, logger = stubLogger()) {
    const server = startMetricsServer(registry, port, logger);
    servers.push(server);

    return new Promise<{ port: number; logger: jest.Mocked<LoggerService> }>((resolve) => {
      server.once("listening", () =>
        resolve({ port: (server.address() as AddressInfo).port, logger }),
      );
      server.once("error", () => resolve({ port, logger }));
    });
  }

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => new Promise((r) => server.close(r))));
  });

  it("serves the registry in the prometheus text format", async () => {
    const registry = new Registry();
    new Counter({ name: "widgets_total", help: "widgets", registers: [registry] }).inc(3);

    const { port } = await start(registry);
    const { status, body } = await get(port, "/metrics");

    expect(status).toBe(200);
    expect(body).toContain("widgets_total 3");
  });

  it("answers 404 anywhere else, so nothing else is reachable on this port", async () => {
    const { port } = await start(new Registry());

    await expect(get(port, "/")).resolves.toMatchObject({ status: 404 });
    await expect(get(port, "/health")).resolves.toMatchObject({ status: 404 });
  });

  it("ignores a query string on the scrape path", async () => {
    const { port } = await start(new Registry());

    await expect(get(port, "/metrics?collect=true")).resolves.toMatchObject({ status: 200 });
  });

  /**
   * Two processes sharing a port in local development is the usual cause, and
   * it must not be fatal — a service that cannot report metrics still has a
   * job to do.
   */
  it("logs and carries on when the port is already taken", async () => {
    const { port } = await start(new Registry());

    const { logger } = await start(new Registry(), port);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("EADDRINUSE"),
      "MetricsServer",
    );
  });

  it("answers 500 rather than hanging when collection fails", async () => {
    const registry = new Registry();
    jest.spyOn(registry, "metrics").mockRejectedValue(new Error("collector exploded"));

    const { port, logger } = await start(registry);

    await expect(get(port, "/metrics")).resolves.toMatchObject({ status: 500 });
    expect(logger.error).toHaveBeenCalled();
  });
});
