import { PrismaService } from "../../prisma/prisma.service";
import { ReactionTarget, reactionWhereUnique } from "./reaction-target.const";
import { Vote } from "./vote.util";

export type VoteClient = Pick<PrismaService, "reaction">;

/**
 * The last flushed vote for a pair — the row, which is the only place that
 * knows it once the cache has said it does not.
 *
 * Here rather than inside the cache because the two callers want it for
 * different reasons and neither reason is the cache's: a flush needs it to know
 * what to mirror, and a write needs it only to report a count. Leaving the
 * cache unable to answer from Postgres is what keeps "the cache does not know"
 * a fact the caller gets to act on.
 */
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
