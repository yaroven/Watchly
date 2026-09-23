import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import type { Request, Response } from "express";
import { JwtConfigName } from "../config/jwt.config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

describe("AuthController", () => {
  let controller: AuthController;
  let authServiceMock: jest.Mocked<AuthService>;
  let res: jest.Mocked<Response>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            register: jest.fn(),
            refreshTokens: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === JwtConfigName ? { refreshExpiresIn: "30d" } : undefined,
            ),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authServiceMock = module.get(AuthService) as jest.Mocked<AuthService>;
    res = { cookie: jest.fn() } as unknown as jest.Mocked<Response>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("login", () => {
    const body = { email: "user@example.com", password: "correct-password" };

    beforeEach(() => {
      (authServiceMock.login as jest.Mock).mockResolvedValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        userId: "user-1",
        role: "USER",
      });
    });

    test("sets the refresh token as an httpOnly cookie scoped to the refresh route", async () => {
      await controller.login(body, res);

      expect(res.cookie).toHaveBeenCalledWith(
        "refreshToken",
        "refresh-token",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "strict",
          path: "/",
          maxAge: expect.any(Number),
        }),
      );
    });

    test("returns the access token, userId, and role — never the refresh token", async () => {
      const result = await controller.login(body, res);
      expect(result).toEqual({ accessToken: "access-token", userId: "user-1", role: "USER" });
    });
  });

  describe("register", () => {
    const body = { email: "new@example.com", password: "new-password" };

    beforeEach(() => {
      (authServiceMock.register as jest.Mock).mockResolvedValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        userId: "user-1",
        role: "USER",
      });
    });

    test("signs the new user straight in — sets the refresh cookie and returns the access token", async () => {
      const result = await controller.register(body, res);

      expect(authServiceMock.register).toHaveBeenCalledWith(body);
      expect(res.cookie).toHaveBeenCalledWith(
        "refreshToken",
        "refresh-token",
        expect.objectContaining({ httpOnly: true, path: "/" }),
      );
      expect(result).toEqual({ accessToken: "access-token", userId: "user-1", role: "USER" });
    });
  });

  describe("refresh", () => {
    test("throws UnauthorizedException when the refresh cookie is missing", async () => {
      const req = { cookies: {} } as unknown as Request;

      await expect(controller.refresh(req, res)).rejects.toThrow(UnauthorizedException);
      expect(authServiceMock.refreshTokens).not.toHaveBeenCalled();
    });

    test("rotates the cookie and returns the new access token when the refresh cookie is present", async () => {
      const req = { cookies: { refreshToken: "old-refresh-token" } } as unknown as Request;
      (authServiceMock.refreshTokens as jest.Mock).mockResolvedValue({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        userId: "user-1",
        role: "USER",
      });

      const result = await controller.refresh(req, res);

      expect(authServiceMock.refreshTokens).toHaveBeenCalledWith("old-refresh-token");
      expect(res.cookie).toHaveBeenCalledWith(
        "refreshToken",
        "new-refresh-token",
        expect.objectContaining({ httpOnly: true, path: "/" }),
      );
      expect(result).toEqual({ accessToken: "new-access-token", userId: "user-1", role: "USER" });
    });
  });
});
