import { Injectable, NotFoundException } from "@nestjs/common";
import { Logged } from "../../decorators/logged.decorator";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  @Logged()
  async submit(commentId: string, userId: string, reason?: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });
    if (!comment) throw new NotFoundException(`Comment with id ${commentId} not found`);

    await this.prisma.report.upsert({
      where: { commentId_userId: { commentId, userId } },
      create: { commentId, userId, reason },
      update: { reason },
    });
  }
}
