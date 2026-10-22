import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type ReportClient = Pick<PrismaService, "report">;

/**
 * Reports, for the one thing that can be reported today.
 *
 * `commentId` is a real foreign key, so a report goes away with its comment —
 * and with the comment's parent, and with the title, all the way up the
 * cascade. Nothing here cleans up.
 */
@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * One standing report per person per comment: reporting again replaces the
   * reason instead of filing a second row, so a moderation queue is a queue of
   * distinct complaints.
   *
   * The comment's existence is the caller's business — it owns the 404.
   */
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
