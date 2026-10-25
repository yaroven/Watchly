import { Injectable } from "@nestjs/common";
import { NO_VOTE_OVERRIDES, VoteOverrides } from "../vote-cache/vote-cache.const";
import { VoteStateService } from "../vote-cache/vote-state.service";
import { ReactionArc, targetOf } from "./utils/reaction-target.const";

/**
 * The read side of reacting: what a viewer holds across the subjects on a page.
 *
 * It exists because every feature that renders a reaction needs this and none
 * of them should reach into the cache for it. Before, `TitleService` and
 * `CommentService` each injected `VoteStateService` and each wrote its own
 * mapping of ids to arcs — a feature depending on infrastructure for a piece of
 * domain knowledge, twice.
 *
 * In its own module rather than in `ReactionModule`, which carries the write
 * path and the flush queue with it. A catalogue page has no business holding a
 * `Queue`, which is the same reason `UserAvatarService` stopped holding one.
 */
@Injectable()
export class ViewerVotesService {
  constructor(private readonly voteState: VoteStateService) {}

  /**
   * Empty for an anonymous read, and that is load-bearing rather than an
   * optimisation: `viewer` is null when nobody was in scope, and a cache that
   * answered about "no viewer" would be answering the wrong question.
   */
  forPage(
    arc: ReactionArc,
    subjects: { id: string }[],
    viewerId: string | null | undefined,
  ): Promise<VoteOverrides> {
    if (!viewerId) return Promise.resolve(NO_VOTE_OVERRIDES);

    return this.voteState.readMany(
      subjects.map((subject) => targetOf(arc, subject.id)),
      viewerId,
    );
  }
}
