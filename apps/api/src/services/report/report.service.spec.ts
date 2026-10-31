import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { ReportService } from "./report.service";

describe("ReportService", () => {
  const commentId = "33333333-3333-4333-8333-333333333333";
  const userId = "22222222-2222-4222-8222-222222222222";

  let service: ReportService;
  let prisma: { comment: { findUnique: jest.Mock }; report: { upsert: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      comment: { findUnique: jest.fn().mockResolvedValue({ id: commentId }) },
      report: { upsert: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [ReportService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(ReportService);
  });

  afterEach(() => jest.clearAllMocks());

  it("files one standing report per person per comment", async () => {
    await service.submit(commentId, userId, "spam");

    expect(prisma.report.upsert).toHaveBeenCalledWith({
      where: { commentId_userId: { commentId, userId } },
      create: { commentId, userId, reason: "spam" },
      update: { reason: "spam" },
    });
  });

  it("replaces the reason rather than filing a second row", async () => {
    await service.submit(commentId, userId, "abuse");

    const [[call]] = prisma.report.upsert.mock.calls as [[{ update: { reason?: string } }]];
    expect(call.update).toEqual({ reason: "abuse" });
  });

  it("answers 404 for a comment that is gone, without writing anything", async () => {
    prisma.comment.findUnique.mockResolvedValue(null);

    await expect(service.submit(commentId, userId)).rejects.toThrow(NotFoundException);
    expect(prisma.report.upsert).not.toHaveBeenCalled();
  });
});
