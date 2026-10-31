import { Controller, Get, NotFoundException, Req, Res } from "@nestjs/common";
import { ApiExcludeEndpoint } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { register } from "prom-client";

@Controller()
export class MetricsController {
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
