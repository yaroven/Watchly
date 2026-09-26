import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Prisma, Role } from "@prisma/client";
import { FilterRule } from "../common/pagination/filter-rule.enum";
import { PrismaService } from "../prisma/prisma.service";
import { hashPassword, verifyPassword } from "./user.password.util";
import { UserService } from "./user.service";

jest.mock("./user.password.util", () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));

describe("UserService", () => {
  let service: UserService;
  let prismaMock: jest.Mocked<PrismaService>;

  const safeUser = {
    id: "user-1",
    email: "user@example.com",
    role: Role.USER,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prismaMock = module.get(PrismaService) as jest.Mocked<PrismaService>;

    (hashPassword as jest.Mock).mockResolvedValue("salt:hash");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    const createData = { email: "user@example.com", password: "plaintext-pw" };

    describe("should hash the password and create the user", () => {
      it("if the email is not taken", async () => {
        (prismaMock.user.create as jest.Mock).mockResolvedValue(safeUser);

        const result = await service.create(createData);

        expect(hashPassword).toHaveBeenCalledWith("plaintext-pw");
        expect(prismaMock.user.create).toHaveBeenCalledWith({
          data: { email: createData.email, password: "salt:hash", role: Role.USER },
          select: { id: true, email: true, role: true, createdAt: true },
        });
        expect(result).toEqual(safeUser);
      });
    });

    describe("should default role to USER", () => {
      it("if no role is provided", async () => {
        (prismaMock.user.create as jest.Mock).mockResolvedValue(safeUser);

        await service.create(createData);

        expect(prismaMock.user.create).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ role: Role.USER }) }),
        );
      });
    });

    describe("should respect an explicit role", () => {
      it("if a role is provided", async () => {
        (prismaMock.user.create as jest.Mock).mockResolvedValue(safeUser);

        await service.create({ ...createData, role: Role.ADMIN });

        expect(prismaMock.user.create).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ role: Role.ADMIN }) }),
        );
      });
    });

    describe("should throw BadRequestException instead of the raw Prisma error", () => {
      it("if the email is already taken", async () => {
        (prismaMock.user.create as jest.Mock).mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "test",
          }),
        );

        const action = service.create(createData);

        await expect(action).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe("findAll", () => {
    describe("should paginate with defaults", () => {
      it("if called without filters", async () => {
        (prismaMock.user.findMany as jest.Mock).mockResolvedValue([safeUser]);
        (prismaMock.user.count as jest.Mock).mockResolvedValue(1);

        const result = await service.findAll({});

        expect(prismaMock.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ skip: 0, take: 10, orderBy: { createdAt: "desc" } }),
        );
        expect(result).toEqual({ items: [safeUser], totalCount: 1 });
      });
    });

    describe("should filter by case-insensitive email substring", () => {
      it("if filtering by email (LIKE)", async () => {
        (prismaMock.user.findMany as jest.Mock).mockResolvedValue([safeUser]);
        (prismaMock.user.count as jest.Mock).mockResolvedValue(1);

        await service.findAll({}, undefined, [
          { property: "email", rule: FilterRule.LIKE, value: "user@" },
        ]);

        expect(prismaMock.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: { email: { contains: "user@", mode: "insensitive" } } }),
        );
      });
    });

    describe("should filter by role", () => {
      it("if filtering by role", async () => {
        (prismaMock.user.findMany as jest.Mock).mockResolvedValue([safeUser]);
        (prismaMock.user.count as jest.Mock).mockResolvedValue(1);

        await service.findAll({}, undefined, [
          { property: "role", rule: FilterRule.EQ, value: Role.ADMIN },
        ]);

        expect(prismaMock.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: { role: Role.ADMIN } }),
        );
      });
    });

    describe("should sort by a given field", () => {
      it("if sorting by that field", async () => {
        (prismaMock.user.findMany as jest.Mock).mockResolvedValue([safeUser]);
        (prismaMock.user.count as jest.Mock).mockResolvedValue(1);

        await service.findAll({}, { property: "email", direction: "asc" });

        expect(prismaMock.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ orderBy: { email: "asc" } }),
        );
      });
    });
  });

  describe("findOne", () => {
    describe("should return the user", () => {
      it("if found", async () => {
        (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(safeUser);

        const result = await service.findOne("user-1");

        expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
          where: { id: "user-1" },
          select: { id: true, email: true, role: true, createdAt: true },
        });
        expect(result).toEqual(safeUser);
      });
    });

    describe("should return null", () => {
      it("if not found", async () => {
        (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(null);

        const result = await service.findOne("missing");

        expect(result).toBeNull();
      });
    });
  });

  describe("validateUser", () => {
    const userWithPassword = { ...safeUser, password: "salt:hash" };

    describe("should return the user without the password", () => {
      it("if the password is valid", async () => {
        (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(userWithPassword);
        (verifyPassword as jest.Mock).mockResolvedValue(true);

        const result = await service.validateUser("user@example.com", "correct-plaintext");

        expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
          where: { email: "user@example.com" },
        });
        expect(verifyPassword).toHaveBeenCalledWith("correct-plaintext", "salt:hash");
        expect(result).toEqual(safeUser);
        expect(result).not.toHaveProperty("password");
      });
    });

    describe("should return null", () => {
      it("if the password is invalid", async () => {
        (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(userWithPassword);
        (verifyPassword as jest.Mock).mockResolvedValue(false);

        const result = await service.validateUser("user@example.com", "wrong-plaintext");

        expect(result).toBeNull();
      });

      it("if no user has that email", async () => {
        (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(null);

        const result = await service.validateUser("missing@example.com", "whatever");

        expect(result).toBeNull();
        expect(verifyPassword).not.toHaveBeenCalled();
      });
    });
  });

  describe("update", () => {
    describe("should throw BadRequestException", () => {
      it("if the user does not exist", async () => {
        (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(null);

        const action = service.update("missing", { email: "new@example.com" });

        await expect(action).rejects.toThrow(BadRequestException);
        expect(prismaMock.user.update).not.toHaveBeenCalled();
      });

      it("if there's a duplicate email", async () => {
        (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(safeUser);
        (prismaMock.user.update as jest.Mock).mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "test",
          }),
        );

        const action = service.update("user-1", { email: "taken@example.com" });

        await expect(action).rejects.toThrow(BadRequestException);
      });
    });

    describe("should update without touching the password", () => {
      it("if none is given", async () => {
        (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(safeUser);
        (prismaMock.user.update as jest.Mock).mockResolvedValue(safeUser);

        await service.update("user-1", { email: "new@example.com" });

        expect(hashPassword).not.toHaveBeenCalled();
        expect(prismaMock.user.update).toHaveBeenCalledWith({
          where: { id: "user-1" },
          data: { email: "new@example.com", password: undefined },
          select: { id: true, email: true, role: true, createdAt: true },
        });
      });
    });

    describe("should hash a newly provided password", () => {
      it("if one is given", async () => {
        (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(safeUser);
        (prismaMock.user.update as jest.Mock).mockResolvedValue(safeUser);

        await service.update("user-1", { password: "new-plaintext" });

        expect(hashPassword).toHaveBeenCalledWith("new-plaintext");
        expect(prismaMock.user.update).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ password: "salt:hash" }) }),
        );
      });
    });
  });

  describe("delete", () => {
    describe("should throw BadRequestException", () => {
      it("if the user does not exist", async () => {
        (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(null);

        const action = service.delete("missing");

        await expect(action).rejects.toThrow(BadRequestException);
        expect(prismaMock.user.delete).not.toHaveBeenCalled();
      });
    });

    describe("should delete and return the user", () => {
      it("if the user exists", async () => {
        (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(safeUser);
        (prismaMock.user.delete as jest.Mock).mockResolvedValue(safeUser);

        const result = await service.delete("user-1");

        expect(prismaMock.user.delete).toHaveBeenCalledWith({
          where: { id: "user-1" },
          select: { id: true, email: true, role: true, createdAt: true },
        });
        expect(result).toEqual(safeUser);
      });
    });
  });
});
