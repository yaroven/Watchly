import { Controller, Get, NotFoundException, Req, Res } from "@nestjs/common";
import { ApiExcludeEndpoint } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { Request, Response } from "express";
import { register } from "prom-client";

@Controller()
export class MetricsController {
  /**
   * Served on the application port, so it is inside everything the Ingress
   * publishes. Two consequences are handled here rather than left to a rule
   * somewhere else:
   *
   * `@SkipThrottle` because `ThrottlerGuard` is global — a scrape is not user
   * traffic and must not be rate limited, least of all once a second
   * Prometheus replica exists.
   *
   * The forwarded-header check is what keeps the route off the internet.
   * Prometheus scrapes a pod by its IP, so a legitimate scrape never crosses
   * the proxy and never carries `x-forwarded-for`; ingress-nginx always sets
   * it. Answering 404 rather than 403 does not confirm the route exists.
   *
   * The alternative was an nginx `server-snippet` denying the path, which is
   * rejected outright on ingress-nginx ≥ 1.9 unless `allow-snippet-annotations`
   * is turned back on — a protection that can silently not apply is worse than
   * none, because it is believed.
   */
  @ApiExcludeEndpoint()
  @SkipThrottle()
  @Get("metrics")
  async metrics(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<string> {
    if (request.headers["x-forwarded-for"] !== undefined) throw new NotFoundException();

    response.setHeader("Content-Type", register.contentType);

    return register.metrics();
  }
}
