import { Test, TestingModule } from "@nestjs/testing";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaService } from "./prisma.service";

jest.mock("@prisma/adapter-pg", () => ({
  PrismaPg: jest.fn(),
}));

const mockConnect = jest.fn();
const mockDisconnect = jest.fn();

jest.mock("@prisma/client", () => {
  return {
    PrismaClient: class {
      $connect = mockConnect;
      $disconnect = mockDisconnect;
    },
  };
});

describe("PrismaService", () => {
  let service: PrismaService;

  beforeEach(async () => {
    process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";

    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should initialize PrismaPg adapter", () => {
    expect(PrismaPg).toHaveBeenCalledWith({ connectionString: process.env.DATABASE_URL });
  });

  test("onModuleInit should call $connect", async () => {
    await service.onModuleInit();
    expect(mockConnect).toHaveBeenCalled();
  });

  test("onModuleDestroy should call $disconnect", async () => {
    await service.onModuleDestroy();
    expect(mockDisconnect).toHaveBeenCalled();
  });
});
