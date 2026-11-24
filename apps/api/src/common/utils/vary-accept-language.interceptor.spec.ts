import { Controller, Get, INestApplication, Res, UseInterceptors } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Response } from "express";
import request from "supertest";
import { VaryAcceptLanguageInterceptor } from "./vary-accept-language.interceptor";

@Controller("probe")
@UseInterceptors(VaryAcceptLanguageInterceptor)
class ProbeController {
  @Get("plain")
  plain() {
    return { ok: true };
  }

  @Get("preset")
  preset(@Res({ passthrough: true }) response: Response) {
    response.vary("Origin");
    return { ok: true };
  }
}

describe("VaryAcceptLanguageInterceptor", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [ProbeController] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("should add Accept-Language to an empty Vary", async () => {
    const response = await request(app.getHttpServer()).get("/probe/plain").expect(200);

    expect(response.headers.vary).toBe("Accept-Language");
  });

  it("should keep a Vary value already set and add Accept-Language beside it", async () => {
    const response = await request(app.getHttpServer()).get("/probe/preset").expect(200);

    expect(response.headers.vary?.split(/,\s*/).sort()).toEqual(["Accept-Language", "Origin"]);
  });
});
