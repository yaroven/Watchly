import { Request, RequestHandler } from "express";
import { Histogram } from "prom-client";

/**
 * Declared at module scope, on `prom-client`'s default registry, which is what
 * `MetricsController` serves. Every metric in this codebase is built this way:
 * a metric created per instance would throw on the second construction, since
 * a registry refuses a duplicate name.
 */
const duration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests served by the api, by route pattern",
  labelNames: ["method", "route", "status_class"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

/**
 * The route PATTERN, never the URL. `/titles/<uuid>` as a label value would
 * mint one time series per title and keep it for the life of the Prometheus
 * instance; `/titles/:id` is one series for all of them. An unmatched request
 * has no pattern, and its path is attacker-controlled, so it collapses to a
 * single bucket rather than becoming a label.
 */
function routeOf(req: Request): string {
  const route: unknown = req.route;

  if (!route || typeof route !== "object" || !("path" in route)) return "unmatched";
  if (typeof route.path !== "string") return "unmatched";

  return `${req.baseUrl}${route.path}`;
}

/**
 * Registered with `app.use` rather than as a `NestMiddleware`, and listening
 * for `finish` rather than wrapping the handler, because both of the labels
 * this needs only exist at that point: the exception filter has written the
 * real status code by then, and Express has assigned the matched route. An
 * interceptor reading `response.statusCode` in `finalize()` runs before the
 * filter and reports every thrown error as the status the handler never set.
 */
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
