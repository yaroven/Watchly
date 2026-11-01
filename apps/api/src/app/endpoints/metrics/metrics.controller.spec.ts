import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { THROTTLER_SKIP } from "@nestjs/throttler/dist/throttler.constants";
import { Request, Response } from "express";
import { Counter, register } from "prom-client";
import { MetricsController } from "./metrics.controller";

const probe = new Counter({ name: "probe_widgets_total", help: "probe" });

describe("MetricsController", () => {
  let controller: MetricsController;

  const request = (headers: Record<string, string> = {}) => ({ headers }) as unknown as Request;

  const response = () => {
    const setHeader = jest.fn();
    return { res: { setHeader } as unknown as Response, setHeader };
  };

  beforeEach(async () => {
    register.resetMetrics();

    const moduleRef = await Test.createTestingModule({
      controllers: [MetricsController],
    }).compile();

    controller = moduleRef.get(MetricsController);
  });

  it("serves the default registry in the prometheus text format", async () => {
    probe.inc(2);
    const { res } = response();

    await expect(controller.metrics(request(), res)).resolves.toContain("probe_widgets_total 2");
  });

  it("sets the exposition content type", async () => {
    const { res, setHeader } = response();

    await controller.metrics(request(), res);

    expect(setHeader).toHaveBeenCalledWith("Content-Type", register.contentType);
  });

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

  it("is exempt from the global rate limit", () => {
    const skip: unknown = Reflect.getMetadata(
      `${THROTTLER_SKIP}default`,
      MetricsController.prototype.metrics,
    );

    expect(skip).toBe(true);
  });

  it("is kept out of the swagger document", () => {
    const excluded: unknown = Reflect.getMetadata(
      "swagger/apiExcludeEndpoint",
      MetricsController.prototype.metrics,
    );

    expect(excluded).toBeTruthy();
  });
});
