import { Request, Response } from "express";
import { EventEmitter } from "node:events";
import { Registry } from "prom-client";
import { httpMetricsMiddleware } from "./http-metrics.middleware";

/**
 * The middleware is driven directly rather than through a server: every label
 * it reads is taken at `finish`, so emitting that event by hand is the whole
 * contract. No express app, no supertest, nothing to get flaky.
 */
function record(
  registry: Registry,
  req: Partial<Request>,
  statusCode: number,
): { next: jest.Mock } {
  const middleware = httpMetricsMiddleware(registry);
  const res = new EventEmitter() as EventEmitter & Response;
  res.statusCode = statusCode;
  const next = jest.fn();

  middleware(req as Request, res, next);
  res.emit("finish");

  return { next };
}

async function labelsOf(registry: Registry): Promise<Record<string, string>[]> {
  const [metric] = (await registry.getMetricsAsJSON()).filter(
    (entry) => entry.name === "http_request_duration_seconds",
  );

  const values = (metric as { values: { labels: Record<string, string> }[] }).values;

  return values.filter((value) => value.labels.route !== undefined).map((value) => value.labels);
}

describe("httpMetricsMiddleware", () => {
  let registry: Registry;

  beforeEach(() => {
    registry = new Registry();
  });

  it("calls next so the request is still handled", () => {
    const { next } = record(registry, { method: "GET", baseUrl: "", route: { path: "/" } }, 200);

    expect(next).toHaveBeenCalled();
  });

  // The whole point of the route label. A URL here would mint one series per
  // title and keep it for the life of the Prometheus instance.
  it("labels the route with the pattern, not the url", async () => {
    record(
      registry,
      { method: "GET", baseUrl: "", route: { path: "/titles/:id" }, url: "/titles/abc-123" },
      200,
    );

    const [labels] = await labelsOf(registry);
    expect(labels.route).toBe("/titles/:id");
  });

  // An unmatched path is attacker-controlled, so it must never reach a label.
  it("collapses a request that matched no route into one bucket", async () => {
    record(registry, { method: "GET", baseUrl: "", url: "/../../etc/passwd" }, 404);

    const [labels] = await labelsOf(registry);
    expect(labels.route).toBe("unmatched");
    expect(labels.status_class).toBe("4xx");
  });

  /**
   * This is the case an interceptor gets wrong: it reads `statusCode` before
   * the exception filter has written it, so a thrown error is recorded as the
   * status the handler never set. Recording on `finish` sees the real one.
   */
  it("records the status the response actually finished with", async () => {
    record(registry, { method: "PATCH", baseUrl: "", route: { path: "/titles/:id" } }, 500);

    const [labels] = await labelsOf(registry);
    expect(labels.status_class).toBe("5xx");
    expect(labels.method).toBe("PATCH");
  });

  it("joins a mounted prefix onto the pattern", async () => {
    record(registry, { method: "GET", baseUrl: "/api", route: { path: "/titles/:id" } }, 200);

    const [labels] = await labelsOf(registry);
    expect(labels.route).toBe("/api/titles/:id");
  });
});
