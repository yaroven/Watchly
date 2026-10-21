import { getQueueToken } from "@nestjs/bullmq";
import { Test, TestingModule } from "@nestjs/testing";
import { VideoType } from "./enums/video-type.enum";
import { VIDEO_TRANSCODE_QUEUE_NAME } from "./video-transcode-queue.options";
import { VideoTranscodeScheduler } from "./video-transcode-scheduler.service";

describe("VideoTranscodeScheduler", () => {
  let scheduler: VideoTranscodeScheduler;
  let queueMock: { add: jest.Mock; getJob: jest.Mock };

  beforeEach(async () => {
    queueMock = { add: jest.fn(), getJob: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoTranscodeScheduler,
        { provide: getQueueToken(VIDEO_TRANSCODE_QUEUE_NAME), useValue: queueMock },
      ],
    }).compile();

    scheduler = module.get(VideoTranscodeScheduler);
  });

  afterEach(() => jest.clearAllMocks());

  describe("schedule", () => {
    it("adds the job to the queue", async () => {
      const payload = { id: "vid-1", type: VideoType.MOVIE };

      await scheduler.schedule(payload);

      expect(queueMock.add).toHaveBeenCalledWith("transcode-video", payload, expect.any(Object));
    });

    // Deterministic, so a redelivered S3 event does not queue a second job.
    it("derives the jobId from the type and the id", async () => {
      await scheduler.schedule({ id: "vid-1", type: VideoType.MOVIE });

      expect(queueMock.add).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ jobId: `transcode-${VideoType.MOVIE}-vid-1` }),
      );
    });
  });

  describe("cancelScheduled", () => {
    const jobInState = (state: string) => ({
      getState: jest.fn().mockResolvedValue(state),
      remove: jest.fn().mockResolvedValue(true),
    });

    it("removes a job that has not started", async () => {
      const job = jobInState("waiting");
      queueMock.getJob.mockResolvedValue(job);

      await scheduler.cancelScheduled("vid-1", VideoType.MOVIE);

      expect(queueMock.getJob).toHaveBeenCalledWith(`transcode-${VideoType.MOVIE}-vid-1`);
      expect(job.remove).toHaveBeenCalled();
    });

    /**
     * A running job is stopped co-operatively instead — the progress handler
     * notices the row is gone and kills ffmpeg. Removing it here would leave
     * the ffmpeg process orphaned.
     */
    it("leaves a job that is already active", async () => {
      const job = jobInState("active");
      queueMock.getJob.mockResolvedValue(job);

      await scheduler.cancelScheduled("vid-1", VideoType.MOVIE);

      expect(job.remove).not.toHaveBeenCalled();
    });

    it("does nothing when no job is scheduled", async () => {
      queueMock.getJob.mockResolvedValue(undefined);

      await scheduler.cancelScheduled("vid-1", VideoType.MOVIE);

      expect(queueMock.getJob).toHaveBeenCalledWith(`transcode-${VideoType.MOVIE}-vid-1`);
    });
  });
});
