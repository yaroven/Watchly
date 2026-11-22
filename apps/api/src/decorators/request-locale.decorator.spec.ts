import { Controller, Get, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { Locale } from "../common/locale.const";
import { RequestLocale } from "./request-locale.decorator";

@Controller("probe")
class ProbeController {
  @Get()
  read(@RequestLocale() locale: Locale) {
    return { locale };
  }
}

describe("@RequestLocale()", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [ProbeController] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("should hand the handler the negotiated locale from Accept-Language", async () => {
    const response = await request(app.getHttpServer())
      .get("/probe")
      .set("Accept-Language", "uk-UA,uk;q=0.9,en;q=0.8")
      .expect(200);

    expect(response.body).toEqual({ locale: "uk" });
  });

  it("should hand the handler English when the request has no Accept-Language", async () => {
    const response = await request(app.getHttpServer()).get("/probe").expect(200);

    expect(response.body).toEqual({ locale: "en" });
  });
});
