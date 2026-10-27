import { PrismaService } from "../../prisma/prisma.service";
import { ReactionTarget, reactionWhereUnique } from "./reaction-target.const";
import { Vote } from "./vote.util";

export type VoteClient = Pick<PrismaService, "reaction">;

export const rowVote = async (
  client: VoteClient,
  target: ReactionTarget,
  userId: string,
): Promise<Vote> => {
  const row = await client.reaction.findUnique({
    where: reactionWhereUnique(target, userId),
    select: { type: true },
  });

  return row?.type ?? null;
};
