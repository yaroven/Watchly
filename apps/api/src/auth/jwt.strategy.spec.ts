import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { Role } from "@prisma/client";
import { JwtConfigName } from "../config/jwt.config";
import { UserService } from "../user/user.service";
import { JwtPayload } from "./interfaces/jwt-payload.interface";
import { JwtStrategy } from "./jwt.strategy";

describe("JwtStrategy", () => {
  let strategy: JwtStrategy;
  let userServiceMock: jest.Mocked<UserService>;

  const payload: JwtPayload = { userId: "user-1", role: Role.USER };
  const user = { id: "user-1", email: "user@example.com", role: Role.USER, createdAt: new Date() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === JwtConfigName
                ? {
                    secret: "test-secret",
                    expiresIn: "1h",
                    refreshSecret: "test-refresh-secret",
                    refreshExpiresIn: "30d",
                  }
                : undefined,
            ),
          },
        },
        {
          provide: UserService,
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    userServiceMock = module.get(UserService) as jest.Mocked<UserService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("validate", () => {
    test("returns the user re-fetched by the payload's userId", async () => {
      (userServiceMock.findOne as jest.Mock).mockResolvedValue(user);

      const result = await strategy.validate(payload);

      expect(userServiceMock.findOne).toHaveBeenCalledWith("user-1");
      expect(result).toEqual(user);
    });

    test("throws UnauthorizedException when the token's user no longer exists", async () => {
      (userServiceMock.findOne as jest.Mock).mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});
