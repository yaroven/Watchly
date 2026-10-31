import { Request, RequestHandler } from "express";
import { Histogram } from "prom-client";

const duration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests served by the api, by route pattern",
  labelNames: ["method", "route", "status_class"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

function routeOf(req: Request): string {
  const route: unknown = req.route;

  if (!route || typeof route !== "object" || !("path" in route)) return "unmatched";
  if (typeof route.path !== "string") return "unmatched";

  return `${req.baseUrl}${route.path}`;
}

export function httpMetricsMiddleware(): RequestHandler {
  return (req, res, next) => {
    const stop = duration.startTimer();

    res.on("finish", () =>
      stop({
        method: req.method,
        route: routeOf(req),
        status_class: `${Math.floor(res.statusCode / 100)}xx`,
      }),
    );

    next();
  };
}
