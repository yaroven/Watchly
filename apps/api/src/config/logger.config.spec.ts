import { buildLoggerParams, LoggerConfig } from "./logger.config";

type Target = { target: string; level: string; options: Record<string, unknown> };

function targetsOf(config: Partial<LoggerConfig> = {}, service = "api"): Target[] {
  const { transport } = buildLoggerParams({ level: "info", pretty: false, ...config }, service)
    .pinoHttp as { transport: { targets: Target[] } };
  return transport.targets;
}

/**
 * These cases guard couplings that live outside this file — the Loki server
 * config and the provisioned Grafana dashboard. Breaking one of them fails
 * silently at runtime (rejected pushes, empty panels), never at build time.
 */
describe("buildLoggerParams", () => {
  const lokiUrl = "http://loki:3100";

  test("should not ship logs anywhere when no Loki URL is configured", () => {
    const targets = targetsOf({ lokiUrl: undefined });
    expect(targets).toHaveLength(1);
    expect(targets[0].target).not.toBe("pino-loki");
  });

  test("should label logs the way the Grafana dashboard queries them", () => {
    const loki = targetsOf({ lokiUrl }, "transcoder-worker").find((t) => t.target === "pino-loki");
    expect(loki!.options).toMatchObject({
      host: lokiUrl,
      labels: { app: "watchly", service: "transcoder-worker" },
    });
  });

  test("should not send structured metadata, which this Loki schema rejects", () => {
    const loki = targetsOf({ lokiUrl }).find((t) => t.target === "pino-loki");
    expect(loki!.options.structuredMetaKey).toBe(false);
  });

  test("should emit raw JSON when not pretty, so Loki can parse it", () => {
    expect(targetsOf({ pretty: false })[0].target).toBe("pino/file");
    expect(targetsOf({ pretty: true })[0].target).toBe("pino-pretty");
  });
});
