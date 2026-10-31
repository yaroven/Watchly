import { Injectable } from "@nestjs/common";
import { Logged } from "../../decorators/logged.decorator";
import { PrismaService } from "../prisma/prisma.service";

export type ReportClient = Pick<PrismaService, "report">;

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  @Logged()
  async submit(
    client: ReportClient,
    commentId: string,
    userId: string,
    reason?: string,
  ): Promise<void> {
    await client.report.upsert({
      where: { commentId_userId: { commentId, userId } },
      create: { commentId, userId, reason },
      update: { reason },
    });
  }
}
