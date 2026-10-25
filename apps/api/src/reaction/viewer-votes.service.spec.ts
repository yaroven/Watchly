import { Test } from "@nestjs/testing";
import { ReactionType } from "@prisma/client";
import { VoteStateService } from "../vote-cache/vote-state.service";
import { ViewerVotesService } from "./viewer-votes.service";

describe("ViewerVotesService", () => {
  const titleId = "11111111-1111-4111-8111-111111111111";
  const commentId = "33333333-3333-4333-8333-333333333333";
  const userId = "22222222-2222-4222-8222-222222222222";

  let service: ViewerVotesService;
  let voteState: { readMany: jest.Mock };

  beforeEach(async () => {
    voteState = { readMany: jest.fn().mockResolvedValue(new Map()) };

    const moduleRef = await Test.createTestingModule({
      providers: [ViewerVotesService, { provide: VoteStateService, useValue: voteState }],
    }).compile();

    service = moduleRef.get(ViewerVotesService);
  });

  afterEach(() => jest.clearAllMocks());

  it("asks for a page of titles in one call", async () => {
    await service.forPage("title", [{ id: titleId }, { id: "another" }], userId);

    expect(voteState.readMany).toHaveBeenCalledWith([{ titleId }, { titleId: "another" }], userId);
  });

  it("maps the comment arc to the other compound key", async () => {
    await service.forPage("comment", [{ id: commentId }], userId);

    expect(voteState.readMany).toHaveBeenCalledWith([{ commentId }], userId);
  });

  it("passes the cache's answers straight through", async () => {
    voteState.readMany.mockResolvedValue(new Map([[titleId, ReactionType.LIKE]]));

    const votes = await service.forPage("title", [{ id: titleId }], userId);

    expect(votes.get(titleId)).toBe(ReactionType.LIKE);
  });

  /**
   * The invariant that used to live in each feature service. `viewer` is null
   * when nobody was in scope, so there is no viewer to answer about — and a
   * cache that answered anyway would be answering the wrong question.
   */
  describe("with no viewer", () => {
    it.each([[null], [undefined]])("reads nothing for %p", async (viewerId) => {
      const votes = await service.forPage("title", [{ id: titleId }], viewerId);

      expect(voteState.readMany).not.toHaveBeenCalled();
      expect(votes.size).toBe(0);
    });
  });

  it("reads nothing for a page with no subjects on it", async () => {
    const votes = await service.forPage("title", [], userId);

    expect(votes.size).toBe(0);
  });
});
