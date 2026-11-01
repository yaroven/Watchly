import { Test } from "@nestjs/testing";
import { ReactionType } from "@prisma/client";
import { CommentService } from "../../../services/comment/comment.service";
import { StoredCommentView } from "../../../services/comment/comment.types";
import { titleSubject } from "../../../services/comment/utils/comment-subject.const";
import { ReportService } from "../../../services/report/report.service";
import { VoteStateService } from "../../../services/vote-cache/vote-state.service";
import { CommentsService } from "./comments.service";

const { LIKE, DISLIKE } = ReactionType;

const stored = (
  id: string,
  storedReaction: ReactionType | null,
  replies: StoredCommentView[] = [],
): StoredCommentView => ({
  id,
  author: { id: "author", name: "author", avatarUrl: null, score: null },
  text: id,
  hasSpoiler: false,
  createdAt: new Date(0),
  likes: 0,
  dislikes: 0,
  replyCount: replies.length,
  storedReaction,
  replies,
});

describe("CommentsService", () => {
  let service: CommentsService;
  let commentService: { findForSubject: jest.Mock; findReplies: jest.Mock };
  let voteState: { forComments: jest.Mock };
  let reports: { submit: jest.Mock };

  beforeEach(async () => {
    commentService = { findForSubject: jest.fn(), findReplies: jest.fn() };
    voteState = { forComments: jest.fn().mockResolvedValue(new Map()) };
    reports = { submit: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: CommentService, useValue: commentService },
        { provide: VoteStateService, useValue: voteState },
        { provide: ReportService, useValue: reports },
      ],
    }).compile();

    service = moduleRef.get(CommentsService);
  });

  it("should ask the cache once for the roots and their previewed replies, with what Postgres holds", async () => {
    commentService.findForSubject.mockResolvedValue({
      items: [stored("root", LIKE, [stored("reply", null)])],
      totalCount: 1,
    });

    await service.findForSubject(titleSubject("t-1"), {}, "viewer-1");

    expect(voteState.forComments).toHaveBeenCalledTimes(1);
    expect(voteState.forComments).toHaveBeenCalledWith(
      [
        { id: "root", storedVote: LIKE },
        { id: "reply", storedVote: null },
      ],
      "viewer-1",
    );
  });

  it("should render the vote the cache settled on, down into the replies", async () => {
    commentService.findForSubject.mockResolvedValue({
      items: [stored("root", LIKE, [stored("reply", null)])],
      totalCount: 1,
    });
    voteState.forComments.mockResolvedValue(
      new Map([
        ["root", DISLIKE],
        ["reply", LIKE],
      ]),
    );

    const { items } = await service.findForSubject(titleSubject("t-1"), {}, "viewer-1");

    expect(items[0].myReaction).toBe(DISLIKE);
    expect(items[0].replies[0].myReaction).toBe(LIKE);
    expect(items[0]).not.toHaveProperty("storedReaction");
  });

  it("should render no vote for an anonymous caller", async () => {
    commentService.findReplies.mockResolvedValue({ items: [stored("reply", null)], totalCount: 1 });

    const { items } = await service.findReplies("root", {});

    expect(items[0].myReaction).toBeNull();
    expect(voteState.forComments).toHaveBeenCalledWith(expect.anything(), undefined);
  });

  it("should keep the page's total", async () => {
    commentService.findReplies.mockResolvedValue({ items: [], totalCount: 7 });

    await expect(service.findReplies("root", {}, "viewer-1")).resolves.toEqual({
      items: [],
      totalCount: 7,
    });
  });

  it("should file a report through the report service", async () => {
    await service.report("c-1", "viewer-1", "spam");

    expect(reports.submit).toHaveBeenCalledWith("c-1", "viewer-1", "spam");
  });
});
