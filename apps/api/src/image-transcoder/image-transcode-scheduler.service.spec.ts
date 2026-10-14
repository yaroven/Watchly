import { getQueueToken } from "@nestjs/bullmq";
import { Test } from "@nestjs/testing";
import { ImageKind } from "./image-profile.const";
import {
  IMAGE_TRANSCODE_JOB_NAME,
  IMAGE_TRANSCODE_QUEUE_NAME,
} from "./image-transcode-queue.options";
import { ImageTranscodeScheduler } from "./image-transcode-scheduler.service";

describe("ImageTranscodeScheduler", () => {
  let scheduler: ImageTranscodeScheduler;
  let queue: { add: jest.Mock };

  beforeEach(async () => {
    queue = { add: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ImageTranscodeScheduler,
        { provide: getQueueToken(IMAGE_TRANSCODE_QUEUE_NAME), useValue: queue },
      ],
    }).compile();

    scheduler = moduleRef.get(ImageTranscodeScheduler);
  });

  afterEach(() => jest.clearAllMocks());

  it("puts the job on the image queue with the kind the worker dispatches on", async () => {
    await scheduler.schedule({
      kind: ImageKind.TITLE_POSTER,
      ownerId: "title-1",
      rawKey: "title-poster/title-1/abc",
    });

    expect(queue.add).toHaveBeenCalledWith(
      IMAGE_TRANSCODE_JOB_NAME,
      { kind: ImageKind.TITLE_POSTER, ownerId: "title-1", rawKey: "title-poster/title-1/abc" },
      expect.objectContaining({ jobId: "image-title-poster/title-1/abc" }),
    );
  });

  it("keys the job on the uploaded object, not on its owner", async () => {
    await scheduler.schedule({
      kind: ImageKind.USER_AVATAR,
      ownerId: "user-1",
      rawKey: "user-avatar/user-1/one",
    });
    await scheduler.schedule({
      kind: ImageKind.USER_AVATAR,
      ownerId: "user-1",
      rawKey: "user-avatar/user-1/one",
    });
    await scheduler.schedule({
      kind: ImageKind.USER_AVATAR,
      ownerId: "user-1",
      rawKey: "user-avatar/user-1/two",
    });

    const jobIds = queue.add.mock.calls.map((call) => (call[2] as { jobId: string }).jobId);
    expect(new Set(jobIds).size).toBe(2);
  });
});
