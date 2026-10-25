import { ExecutionContext, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ReactionType } from "@prisma/client";
import request from "supertest";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ReactionController } from "./reaction.controller";
import { ReactionService } from "./reaction.service";

/**
 * Through HTTP rather than by calling the handler: the segment-to-kind pipe is
 * a param pipe, and Nest does not run those on a direct method call.
 */
describe("ReactionController", () => {
  const TITLE_ID = "11111111-1111-4111-8111-111111111111";
  const COMMENT_ID = "33333333-3333-4333-8333-333333333333";
  const VIEWER_ID = "22222222-2222-4222-8222-222222222222";

  let app: INestApplication;
  let reactionService: { assertSubjectExists: jest.Mock; setVote: jest.Mock; clearVote: jest.Mock };

  beforeEach(async () => {
    reactionService = {
      assertSubjectExists: jest.fn().mockResolvedValue(undefined),
      setVote: jest.fn().mockResolvedValue({
        likes: 1,
        dislikes: 0,
        commentCount: 0,
        myReaction: ReactionType.LIKE,
      }),
      clearVote: jest
        .fn()
        .mockResolvedValue({ likes: 0, dislikes: 0, commentCount: 0, myReaction: null }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ReactionController],
      providers: [{ provide: ReactionService, useValue: reactionService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context.switchToHttp().getRequest().userId = VIEWER_ID;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it.each([
    ["titles", TITLE_ID, { titleId: TITLE_ID }],
    ["comments", COMMENT_ID, { commentId: COMMENT_ID }],
  ])("should turn the %s segment into its arc", async (segment, id, target) => {
    await request(app.getHttpServer())
      .put(`/reactions/${segment}/${id}`)
      .send({ type: ReactionType.LIKE })
      .expect(200);

    expect(reactionService.setVote).toHaveBeenCalledWith(target, VIEWER_ID, ReactionType.LIKE);
  });

  it("should answer with the counts the vote produced", async () => {
    const response = await request(app.getHttpServer())
      .put(`/reactions/titles/${TITLE_ID}`)
      .send({ type: ReactionType.LIKE })
      .expect(200);

    expect(response.body).toEqual({
      likes: 1,
      dislikes: 0,
      commentCount: 0,
      myReaction: ReactionType.LIKE,
    });
  });

  it("should carry the viewer from the request, not from the body", async () => {
    await request(app.getHttpServer()).delete(`/reactions/comments/${COMMENT_ID}`).expect(200);

    expect(reactionService.clearVote).toHaveBeenCalledWith({ commentId: COMMENT_ID }, VIEWER_ID);
  });

  // A kind the arcs do not cover is a bad request, not a 404 or a silent write.
  it("should refuse a segment that cannot carry reactions", async () => {
    await request(app.getHttpServer())
      .put(`/reactions/seasons/${TITLE_ID}`)
      .send({ type: ReactionType.LIKE })
      .expect(400);

    expect(reactionService.setVote).not.toHaveBeenCalled();
  });

  it("should refuse an id that is not a uuid before looking anything up", async () => {
    await request(app.getHttpServer())
      .put("/reactions/titles/not-a-uuid")
      .send({ type: ReactionType.LIKE })
      .expect(400);

    expect(reactionService.assertSubjectExists).not.toHaveBeenCalled();
  });

  /** Absolute means the second identical call is not a withdrawal. */
  it("should pass the same vote through twice rather than treating it as a toggle", async () => {
    const send = () =>
      request(app.getHttpServer())
        .put(`/reactions/titles/${TITLE_ID}`)
        .send({ type: ReactionType.LIKE })
        .expect(200);

    await send();
    await send();

    expect(reactionService.setVote).toHaveBeenNthCalledWith(
      2,
      { titleId: TITLE_ID },
      VIEWER_ID,
      ReactionType.LIKE,
    );
  });

  it("should check the subject exists before voting on it", async () => {
    await request(app.getHttpServer())
      .put(`/reactions/titles/${TITLE_ID}`)
      .send({ type: ReactionType.LIKE })
      .expect(200);

    expect(reactionService.assertSubjectExists).toHaveBeenCalledWith({ titleId: TITLE_ID });
  });
});
