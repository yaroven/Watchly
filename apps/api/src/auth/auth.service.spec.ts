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

    describe("should sign an access token with the default (global) options", () => {
      it("if the credentials are valid", async () => {
        (userServiceMock.validateUser as jest.Mock).mockResolvedValue(user);
        (jwtServiceMock.sign as jest.Mock)
          .mockReturnValueOnce("access-token")
          .mockReturnValueOnce("refresh-token");

        await service.login(loginData);

        expect(jwtServiceMock.sign).toHaveBeenNthCalledWith(1, {
          userId: "user-1",
          role: Role.USER,
        });
      });
    });

    describe("should sign a refresh token with the separate refresh secret and TTL", () => {
      it("if the credentials are valid", async () => {
        (userServiceMock.validateUser as jest.Mock).mockResolvedValue(user);
        (jwtServiceMock.sign as jest.Mock)
          .mockReturnValueOnce("access-token")
          .mockReturnValueOnce("refresh-token");

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
    });

    describe("should return both tokens plus the user's id and role", () => {
      it("if the credentials are valid", async () => {
        (userServiceMock.validateUser as jest.Mock).mockResolvedValue(user);
        (jwtServiceMock.sign as jest.Mock)
          .mockReturnValueOnce("access-token")
          .mockReturnValueOnce("refresh-token");

        const result = await service.login(loginData);

        expect(result).toEqual({
          accessToken: "access-token",
          refreshToken: "refresh-token",
          userId: "user-1",
          role: Role.USER,
        });
      });
    });

    describe("should throw BadRequestException without signing any token", () => {
      it("if the credentials are invalid", async () => {
        (userServiceMock.validateUser as jest.Mock).mockResolvedValue(null);

        await expect(service.login(loginData)).rejects.toThrow(BadRequestException);
        expect(jwtServiceMock.sign).not.toHaveBeenCalled();
      });
    });
  });

  describe("register", () => {
    const registerData = { email: "new@example.com", password: "new-password" };

    describe("should create the user with the USER role", () => {
      it("if the email is free", async () => {
        (userServiceMock.findByEmail as jest.Mock).mockResolvedValue(null);
        (userServiceMock.create as jest.Mock).mockResolvedValue(user);
        (jwtServiceMock.sign as jest.Mock)
          .mockReturnValueOnce("access-token")
          .mockReturnValueOnce("refresh-token");

        await service.register(registerData);

        expect(userServiceMock.create).toHaveBeenCalledWith({ ...registerData, role: Role.USER });
      });
    });

    describe("should sign the new user straight in", () => {
      it("if the email is free", async () => {
        (userServiceMock.findByEmail as jest.Mock).mockResolvedValue(null);
        (userServiceMock.create as jest.Mock).mockResolvedValue(user);
        (jwtServiceMock.sign as jest.Mock)
          .mockReturnValueOnce("access-token")
          .mockReturnValueOnce("refresh-token");

        const result = await service.register(registerData);

        expect(result).toEqual({
          accessToken: "access-token",
          refreshToken: "refresh-token",
          userId: "user-1",
          role: Role.USER,
        });
      });
    });

    describe("should throw ConflictException", () => {
      it("if the email is already taken", async () => {
        (userServiceMock.findByEmail as jest.Mock).mockResolvedValue(user);

        await expect(service.register(registerData)).rejects.toThrow(ConflictException);
        expect(userServiceMock.create).not.toHaveBeenCalled();
      });
    });
  });

  describe("refreshTokens", () => {
    describe("should verify with the refresh secret, not the access secret", () => {
      it("if the refresh token is valid and the user still exists", async () => {
        (jwtServiceMock.verifyAsync as jest.Mock).mockResolvedValue({ userId: "user-1" });
        (userServiceMock.findOne as jest.Mock).mockResolvedValue(user);
        (jwtServiceMock.sign as jest.Mock)
          .mockReturnValueOnce("new-access-token")
          .mockReturnValueOnce("new-refresh-token");

        await service.refreshTokens("some-refresh-token");

        expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith("some-refresh-token", {
          secret: "refresh-secret",
        });
      });
    });

    describe("should rotate both tokens", () => {
      it("if the refresh token is valid and the user still exists", async () => {
        (jwtServiceMock.verifyAsync as jest.Mock).mockResolvedValue({ userId: "user-1" });
        (userServiceMock.findOne as jest.Mock).mockResolvedValue(user);
        (jwtServiceMock.sign as jest.Mock)
          .mockReturnValueOnce("new-access-token")
          .mockReturnValueOnce("new-refresh-token");

        const result = await service.refreshTokens("some-refresh-token");

        expect(result).toEqual({
          accessToken: "new-access-token",
          refreshToken: "new-refresh-token",
          userId: "user-1",
          role: Role.USER,
        });
      });
    });

    describe("should throw UnauthorizedException", () => {
      it("if the token is invalid or expired", async () => {
        (jwtServiceMock.verifyAsync as jest.Mock).mockRejectedValue(new Error("jwt expired"));

        await expect(service.refreshTokens("bad-token")).rejects.toThrow(UnauthorizedException);
      });

      it("if the token is valid but the user was deleted", async () => {
        (jwtServiceMock.verifyAsync as jest.Mock).mockResolvedValue({ userId: "deleted-user" });
        (userServiceMock.findOne as jest.Mock).mockResolvedValue(null);

        await expect(service.refreshTokens("still-valid-token")).rejects.toThrow(
          UnauthorizedException,
        );
      });
    });
  });
});
