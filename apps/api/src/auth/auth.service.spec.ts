import { BadRequestException, ConflictException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { Role } from "@prisma/client";
import { JwtConfigName } from "../config/jwt.config";
import { UserService } from "../user/user.service";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let service: AuthService;
  let userServiceMock: jest.Mocked<UserService>;
  let jwtServiceMock: jest.Mocked<JwtService>;

  const jwtConfig = {
    secret: "access-secret",
    expiresIn: "1h",
    refreshSecret: "refresh-secret",
    refreshExpiresIn: "30d",
  };
  const user = { id: "user-1", email: "user@example.com", role: Role.USER, createdAt: new Date() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            validateUser: jest.fn(),
            findByEmail: jest.fn(),
            create: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => (key === JwtConfigName ? jwtConfig : undefined)),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userServiceMock = module.get(UserService) as jest.Mocked<UserService>;
    jwtServiceMock = module.get(JwtService) as jest.Mocked<JwtService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("login", () => {
    const loginData = { email: "user@example.com", password: "correct-password" };

    describe("when the credentials are valid", () => {
      beforeEach(() => {
        (userServiceMock.validateUser as jest.Mock).mockResolvedValue(user);
        (jwtServiceMock.sign as jest.Mock)
          .mockReturnValueOnce("access-token")
          .mockReturnValueOnce("refresh-token");
      });

      test("signs an access token with the default (global) options", async () => {
        await service.login(loginData);
        expect(jwtServiceMock.sign).toHaveBeenNthCalledWith(1, {
          userId: "user-1",
          role: Role.USER,
        });
      });

      test("signs a refresh token with the separate refresh secret and TTL", async () => {
        await service.login(loginData);
        expect(jwtServiceMock.sign).toHaveBeenNthCalledWith(
          2,
          { userId: "user-1", role: Role.USER },
          {
            secret: "refresh-secret",
            expiresIn: "30d",
          },
        );
      });

      test("returns both tokens plus the user's id and role", async () => {
        const result = await service.login(loginData);
        expect(result).toEqual({
          accessToken: "access-token",
          refreshToken: "refresh-token",
          userId: "user-1",
          role: Role.USER,
        });
      });
    });

    describe("when the credentials are invalid", () => {
      beforeEach(() => {
        (userServiceMock.validateUser as jest.Mock).mockResolvedValue(null);
      });

      test("throws BadRequestException without signing any token", async () => {
        await expect(service.login(loginData)).rejects.toThrow(BadRequestException);
        expect(jwtServiceMock.sign).not.toHaveBeenCalled();
      });
    });
  });

  describe("register", () => {
    const registerData = { email: "new@example.com", password: "new-password" };

    describe("when the email is free", () => {
      beforeEach(() => {
        (userServiceMock.findByEmail as jest.Mock).mockResolvedValue(null);
        (userServiceMock.create as jest.Mock).mockResolvedValue(user);
        (jwtServiceMock.sign as jest.Mock)
          .mockReturnValueOnce("access-token")
          .mockReturnValueOnce("refresh-token");
      });

      test("creates the user with the USER role", async () => {
        await service.register(registerData);
        expect(userServiceMock.create).toHaveBeenCalledWith({ ...registerData, role: Role.USER });
      });

      test("signs the new user straight in", async () => {
        const result = await service.register(registerData);
        expect(result).toEqual({
          accessToken: "access-token",
          refreshToken: "refresh-token",
          userId: "user-1",
          role: Role.USER,
        });
      });
    });

    test("throws ConflictException when the email is already taken", async () => {
      (userServiceMock.findByEmail as jest.Mock).mockResolvedValue(user);

      await expect(service.register(registerData)).rejects.toThrow(ConflictException);
      expect(userServiceMock.create).not.toHaveBeenCalled();
    });
  });

  describe("refreshTokens", () => {
    describe("when the refresh token is valid and the user still exists", () => {
      beforeEach(() => {
        (jwtServiceMock.verifyAsync as jest.Mock).mockResolvedValue({ userId: "user-1" });
        (userServiceMock.findOne as jest.Mock).mockResolvedValue(user);
        (jwtServiceMock.sign as jest.Mock)
          .mockReturnValueOnce("new-access-token")
          .mockReturnValueOnce("new-refresh-token");
      });

      test("verifies with the refresh secret, not the access secret", async () => {
        await service.refreshTokens("some-refresh-token");
        expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith("some-refresh-token", {
          secret: "refresh-secret",
        });
      });

      test("rotates both tokens", async () => {
        const result = await service.refreshTokens("some-refresh-token");
        expect(result).toEqual({
          accessToken: "new-access-token",
          refreshToken: "new-refresh-token",
          userId: "user-1",
          role: Role.USER,
        });
      });
    });

    test("throws UnauthorizedException when the token is invalid or expired", async () => {
      (jwtServiceMock.verifyAsync as jest.Mock).mockRejectedValue(new Error("jwt expired"));

      await expect(service.refreshTokens("bad-token")).rejects.toThrow(UnauthorizedException);
    });

    test("throws UnauthorizedException when the token is valid but the user was deleted", async () => {
      (jwtServiceMock.verifyAsync as jest.Mock).mockResolvedValue({ userId: "deleted-user" });
      (userServiceMock.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.refreshTokens("still-valid-token")).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
