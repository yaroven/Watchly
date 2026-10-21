import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { THROTTLER_SKIP } from "@nestjs/throttler/dist/throttler.constants";
import { Request, Response } from "express";
import { Counter, Registry } from "prom-client";
import { METRICS_REGISTRY } from "./metrics.const";
import { MetricsController } from "./metrics.controller";

describe("MetricsController", () => {
  let controller: MetricsController;
  let registry: Registry;

  const request = (headers: Record<string, string> = {}) => ({ headers }) as unknown as Request;

  const response = () => {
    const setHeader = jest.fn();
    return { res: { setHeader } as unknown as Response, setHeader };
  };

  beforeEach(async () => {
    registry = new Registry();
    new Counter({ name: "widgets_total", help: "widgets", registers: [registry] }).inc(2);

    const moduleRef = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [{ provide: METRICS_REGISTRY, useValue: registry }],
    }).compile();

    controller = moduleRef.get(MetricsController);
  });

  it("serves the registry in the prometheus text format", async () => {
    const { res } = response();

    await expect(controller.metrics(request(), res)).resolves.toContain("widgets_total 2");
  });

  // Prometheus parses by content type; the default JSON one would make the
  // scrape fail rather than look empty.
  it("sets the exposition content type from the registry", async () => {
    const { res, setHeader } = response();

    await controller.metrics(request(), res);

    expect(setHeader).toHaveBeenCalledWith("Content-Type", registry.contentType);
  });

  /**
   * This is what keeps the route off the internet now that it shares the port
   * the Ingress publishes. A scrape goes to the pod IP and carries no
   * forwarded header; anything arriving through ingress-nginx does.
   */
  it("refuses a request that came through the proxy", async () => {
    const { res } = response();

    await expect(
      controller.metrics(request({ "x-forwarded-for": "203.0.113.7" }), res),
    ).rejects.toThrow(NotFoundException);
  });

  it("refuses it even when the header is empty, since the proxy still set it", async () => {
    const { res } = response();

    await expect(controller.metrics(request({ "x-forwarded-for": "" }), res)).rejects.toThrow(
      NotFoundException,
    );
  });

  // ThrottlerGuard is global, and a scrape is not user traffic. The key is
  // the library constant suffixed with the throttler's name.
  it("is exempt from the global rate limit", () => {
    const skip: unknown = Reflect.getMetadata(
      `${THROTTLER_SKIP}default`,
      MetricsController.prototype.metrics,
    );

    expect(skip).toBe(true);
  });

  // It would otherwise show up in /docs as a public endpoint. The key is
  // swagger's own and is not exported from the package, so it is spelled out.
  it("is kept out of the swagger document", () => {
    const excluded: unknown = Reflect.getMetadata(
      "swagger/apiExcludeEndpoint",
      MetricsController.prototype.metrics,
    );

    expect(excluded).toBeTruthy();
  });
});
