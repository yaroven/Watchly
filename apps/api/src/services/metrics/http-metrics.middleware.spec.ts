import { Request, Response } from "express";
import { EventEmitter } from "node:events";
import { register } from "prom-client";
import { httpMetricsMiddleware } from "./http-metrics.middleware";

function record(req: Partial<Request>, statusCode: number): { next: jest.Mock } {
  const middleware = httpMetricsMiddleware();
  const res = new EventEmitter() as EventEmitter & Response;
  res.statusCode = statusCode;
  const next = jest.fn();

  middleware(req as Request, res, next);
  res.emit("finish");

  return { next };
}

async function labelsOf(): Promise<Record<string, string>[]> {
  const [metric] = (await register.getMetricsAsJSON()).filter(
    (entry) => entry.name === "http_request_duration_seconds",
  );

  const values = (metric as { values: { labels: Record<string, string> }[] }).values;

  return values.filter((value) => value.labels.route !== undefined).map((value) => value.labels);
}

describe("httpMetricsMiddleware", () => {
  beforeEach(() => register.resetMetrics());

  it("calls next so the request is still handled", () => {
    const { next } = record({ method: "GET", baseUrl: "", route: { path: "/" } }, 200);

    expect(next).toHaveBeenCalled();
  });

  it("labels the route with the pattern, not the url", async () => {
    record(
      { method: "GET", baseUrl: "", route: { path: "/titles/:id" }, url: "/titles/abc-123" },
      200,
    );

    const [labels] = await labelsOf();
    expect(labels.route).toBe("/titles/:id");
  });

  it("collapses a request that matched no route into one bucket", async () => {
    record({ method: "GET", baseUrl: "", url: "/../../etc/passwd" }, 404);

    const [labels] = await labelsOf();
    expect(labels.route).toBe("unmatched");
    expect(labels.status_class).toBe("4xx");
  });

  it("records the status the response actually finished with", async () => {
    record({ method: "PATCH", baseUrl: "", route: { path: "/titles/:id" } }, 500);

    const [labels] = await labelsOf();
    expect(labels.status_class).toBe("5xx");
    expect(labels.method).toBe("PATCH");
  });

  it("joins a mounted prefix onto the pattern", async () => {
    record({ method: "GET", baseUrl: "/api", route: { path: "/titles/:id" } }, 200);

    const [labels] = await labelsOf();
    expect(labels.route).toBe("/api/titles/:id");
  });
});
