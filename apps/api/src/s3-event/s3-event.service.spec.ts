import { DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { register } from "prom-client";
import { ImageKind } from "../image-transcoder/image-profile.const";
import { ImageTranscodeScheduler } from "../image-transcoder/image-transcode-scheduler.service";
import { PrismaService } from "../prisma/prisma.service";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { VideoTranscoderService } from "../video-transcoder/video-transcoder.service";
import { S3EventService } from "./s3-event.service";

const mockSend = jest.fn();

const mockConfig = {
  region: "us-east-1",
  internalEndpoint: "http://localhost:9000",
  accessKeyId: "test",
  secretAccessKey: "test",
  rawBucketName: "watchly-raw",
  queueName: "watchly-s3-events",
};

const mockQueueUrl = "https://sqs.us-east-1.amazonaws.com/123/watchly-s3-events";
const mockDlqUrl = "https://sqs.us-east-1.amazonaws.com/123/watchly-s3-events-dlq";

describe("S3EventService", () => {
  let service: S3EventService;
  let prismaMock: jest.Mocked<PrismaService>;
  let videoTranscoderServiceMock: jest.Mocked<VideoTranscoderService>;
  let imageSchedulerMock: { schedule: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    // Metrics are module-level on the default registry, so values survive from
    // one test to the next unless they are cleared. Registrations stay.
    register.resetMetrics();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3EventService,
        {
          provide: PrismaService,
          useValue: {
            episode: { findUnique: jest.fn() },
            title: { findUnique: jest.fn() },
          },
        },
        {
          provide: VideoTranscoderService,
          useValue: {
            scheduleTranscodeVideo: jest.fn(),
          },
        },
        {
          provide: ImageTranscodeScheduler,
          useValue: { schedule: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue(mockConfig),
          },
        },
      ],
    }).compile();

    service = module.get<S3EventService>(S3EventService);
    prismaMock = module.get(PrismaService) as jest.Mocked<PrismaService>;
    videoTranscoderServiceMock = module.get(
      VideoTranscoderService,
    ) as jest.Mocked<VideoTranscoderService>;
    imageSchedulerMock = module.get(ImageTranscodeScheduler);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).sqsClient = { send: mockSend };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).queueUrl = mockQueueUrl;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("resolveQueueUrl", () => {
    describe("should return the existing queue's url", () => {
      it("if the queue was provisioned with the environment", async () => {
        mockSend.mockResolvedValueOnce({ QueueUrl: mockQueueUrl });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (service as any).resolveQueueUrl();

        expect(result).toBe(mockQueueUrl);
      });
    });

    describe("should throw a message naming the queue", () => {
      it("if it does not exist, since this service no longer creates it", async () => {
        mockSend.mockRejectedValueOnce(new Error("AWS.SimpleQueueService.NonExistentQueue"));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const action = (service as any).resolveQueueUrl();

        await expect(action).rejects.toThrow(mockConfig.queueName);
      });
    });
  });

  describe("resolveLegacyTask", () => {
    it("should return EPISODE task when episode exists", async () => {
      (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue({
        id: "11111111-1111-4111-8111-111111111111",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (service as any).resolveLegacyTask(
        "11111111-1111-4111-8111-111111111111",
      );

      expect(result).toEqual({
        id: "11111111-1111-4111-8111-111111111111",
        type: VideoType.EPISODE,
      });
      expect(prismaMock.title.findUnique).not.toHaveBeenCalled();
    });

    it("should return MOVIE task when episode not found but title exists", async () => {
      (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaMock.title.findUnique as jest.Mock).mockResolvedValue({
        id: "22222222-2222-4222-8222-222222222222",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (service as any).resolveLegacyTask(
        "22222222-2222-4222-8222-222222222222",
      );

      expect(result).toEqual({ id: "22222222-2222-4222-8222-222222222222", type: VideoType.MOVIE });
    });

    it("should return null when neither episode nor title exists", async () => {
      (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaMock.title.findUnique as jest.Mock).mockResolvedValue(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (service as any).resolveLegacyTask(
        "33333333-3333-4333-8333-333333333333",
      );

      expect(result).toBeNull();
    });
  });

  describe("dispatch by key prefix", () => {
    const TITLE_ID = "11111111-1111-4111-8111-111111111111";
    const USER_ID = "44444444-4444-4444-8444-444444444444";

    const messageFor = (key: string) => ({
      MessageId: "msg-1",
      ReceiptHandle: "receipt-123",
      Body: JSON.stringify({ Records: [{ s3: { object: { key } } }] }),
    });

    it("should schedule a movie transcode without asking the database what the id is", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).processMessage(messageFor(`title-video/${TITLE_ID}`));

      expect(videoTranscoderServiceMock.scheduleTranscodeVideo).toHaveBeenCalledWith({
        id: TITLE_ID,
        type: VideoType.MOVIE,
      });
      expect(prismaMock.title.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.episode.findUnique).not.toHaveBeenCalled();
    });

    it("should schedule an episode transcode from the episode prefix", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).processMessage(messageFor(`episode-video/${TITLE_ID}`));

      expect(videoTranscoderServiceMock.scheduleTranscodeVideo).toHaveBeenCalledWith({
        id: TITLE_ID,
        type: VideoType.EPISODE,
      });
    });

    it("should hand an avatar to the image queue, not the transcoder", async () => {
      const key = `user-avatar/${USER_ID}/abc-123`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).processMessage(messageFor(key));

      expect(imageSchedulerMock.schedule).toHaveBeenCalledWith({
        kind: ImageKind.USER_AVATAR,
        ownerId: USER_ID,
        rawKey: key,
      });
      expect(videoTranscoderServiceMock.scheduleTranscodeVideo).not.toHaveBeenCalled();
    });

    it.each([
      ["a title poster", `title-poster/${TITLE_ID}/abc-123`, ImageKind.TITLE_POSTER],
      ["a season poster", `season-poster/${TITLE_ID}/abc-123`, ImageKind.SEASON_POSTER],
      ["an artist photo", `artist-photo/${TITLE_ID}/abc-123`, ImageKind.ARTIST_PHOTO],
    ])("should name the profile for %s", async (_case, key, kind) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).processMessage(messageFor(key));

      expect(imageSchedulerMock.schedule).toHaveBeenCalledWith({
        kind,
        ownerId: TITLE_ID,
        rawKey: key,
      });
      expect(videoTranscoderServiceMock.scheduleTranscodeVideo).not.toHaveBeenCalled();
    });

    it("should ignore a prefix it does not recognise, and still delete the message", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).processMessage(messageFor("something-else/abc"));

      expect(videoTranscoderServiceMock.scheduleTranscodeVideo).not.toHaveBeenCalled();
      expect(imageSchedulerMock.schedule).not.toHaveBeenCalled();
      expect(mockSend.mock.calls[0][0]).toBeInstanceOf(DeleteMessageCommand);
    });

    it("should still resolve a bare uuid by database probe", async () => {
      (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue({ id: TITLE_ID });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).processMessage(messageFor(TITLE_ID));

      expect(videoTranscoderServiceMock.scheduleTranscodeVideo).toHaveBeenCalledWith({
        id: TITLE_ID,
        type: VideoType.EPISODE,
      });
    });
  });

  describe("processMessage", () => {
    it("should process valid episode message and schedule transcode", async () => {
      const message = {
        MessageId: "msg-1",
        ReceiptHandle: "receipt-123",
        Body: JSON.stringify({
          Records: [{ s3: { object: { key: "11111111-1111-4111-8111-111111111111" } } }],
        }),
      };

      (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue({
        id: "11111111-1111-4111-8111-111111111111",
      });
      videoTranscoderServiceMock.scheduleTranscodeVideo.mockResolvedValue(undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).processMessage(message);

      expect(videoTranscoderServiceMock.scheduleTranscodeVideo).toHaveBeenCalledWith({
        id: "11111111-1111-4111-8111-111111111111",
        type: VideoType.EPISODE,
      });
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: { QueueUrl: mockQueueUrl, ReceiptHandle: "receipt-123" },
        }),
      );
      expect(mockSend.mock.calls[0][0]).toBeInstanceOf(DeleteMessageCommand);
    });

    it("should process valid title (movie) message and schedule transcode", async () => {
      const message = {
        MessageId: "msg-1",
        ReceiptHandle: "receipt-456",
        Body: JSON.stringify({
          Records: [{ s3: { object: { key: "22222222-2222-4222-8222-222222222222" } } }],
        }),
      };

      (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaMock.title.findUnique as jest.Mock).mockResolvedValue({
        id: "22222222-2222-4222-8222-222222222222",
      });
      videoTranscoderServiceMock.scheduleTranscodeVideo.mockResolvedValue(undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).processMessage(message);

      expect(videoTranscoderServiceMock.scheduleTranscodeVideo).toHaveBeenCalledWith({
        id: "22222222-2222-4222-8222-222222222222",
        type: VideoType.MOVIE,
      });
    });

    it("should delete message with no Records instead of leaving it in the queue", async () => {
      const message = {
        MessageId: "msg-1",
        ReceiptHandle: "receipt-789",
        Body: JSON.stringify({}),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).processMessage(message);

      expect(videoTranscoderServiceMock.scheduleTranscodeVideo).not.toHaveBeenCalled();
      expect(mockSend.mock.calls[0][0]).toBeInstanceOf(DeleteMessageCommand);
    });

    it("should skip scheduling when task resolution returns null", async () => {
      const message = {
        MessageId: "msg-1",
        ReceiptHandle: "receipt-abc",
        Body: JSON.stringify({
          Records: [{ s3: { object: { key: "33333333-3333-4333-8333-333333333333" } } }],
        }),
      };

      (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaMock.title.findUnique as jest.Mock).mockResolvedValue(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).processMessage(message);

      expect(videoTranscoderServiceMock.scheduleTranscodeVideo).not.toHaveBeenCalled();
    });

    it("should delete message only after successful processing", async () => {
      const message = {
        MessageId: "msg-1",
        ReceiptHandle: "receipt-xyz",
        Body: JSON.stringify({
          Records: [{ s3: { object: { key: "11111111-1111-4111-8111-111111111111" } } }],
        }),
      };

      (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue({
        id: "11111111-1111-4111-8111-111111111111",
      });
      videoTranscoderServiceMock.scheduleTranscodeVideo.mockResolvedValue(undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).processMessage(message);

      const deleteCall = mockSend.mock.calls.find(
        (call) => call[0] instanceof DeleteMessageCommand,
      );
      expect(deleteCall).toBeDefined();
    });

    it("should delete unparseable (poison-pill) messages instead of retrying forever", async () => {
      const message = {
        MessageId: "msg-1",
        ReceiptHandle: "receipt-error",
        Body: "invalid json",
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).processMessage(message);

      expect(mockSend.mock.calls[0][0]).toBeInstanceOf(DeleteMessageCommand);
    });

    it("should not delete message when processing a valid message throws", async () => {
      const message = {
        MessageId: "msg-1",
        ReceiptHandle: "receipt-retry",
        Body: JSON.stringify({
          Records: [{ s3: { object: { key: "11111111-1111-4111-8111-111111111111" } } }],
        }),
      };

      (prismaMock.episode.findUnique as jest.Mock).mockRejectedValue(new Error("db down"));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).processMessage(message);

      expect(mockSend).not.toHaveBeenCalled();
    });

    it("should decode percent-encoded characters in S3 key before matching", async () => {
      const message = {
        MessageId: "msg-1",
        ReceiptHandle: "receipt-b",
        Body: JSON.stringify({
          Records: [{ s3: { object: { key: "%32%32222222-2222-4222-8222-222222222222" } } }],
        }),
      };

      (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaMock.title.findUnique as jest.Mock).mockResolvedValue({
        id: "22222222-2222-4222-8222-222222222222",
      });
      videoTranscoderServiceMock.scheduleTranscodeVideo.mockResolvedValue(undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).processMessage(message);

      expect(prismaMock.episode.findUnique).toHaveBeenCalledWith({
        where: { id: "22222222-2222-4222-8222-222222222222" },
      });
    });

    it("should skip non-UUID S3 keys without querying the database", async () => {
      const message = {
        MessageId: "msg-1",
        ReceiptHandle: "receipt-c",
        Body: JSON.stringify({
          Records: [{ s3: { object: { key: "not-a-uuid.mp4" } } }],
        }),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).processMessage(message);

      expect(prismaMock.episode.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.title.findUnique).not.toHaveBeenCalled();
      expect(videoTranscoderServiceMock.scheduleTranscodeVideo).not.toHaveBeenCalled();
    });
  });
  describe("metrics", () => {
    const TITLE = "11111111-1111-4111-8111-111111111111";

    const messageWith = (record: Record<string, unknown>) => ({
      MessageId: "msg-1",
      ReceiptHandle: "receipt-a",
      Body: JSON.stringify({ Records: [record] }),
    });

    const textOf = () => register.metrics();

    /**
     * The end-to-end number: how long an upload waited between S3 accepting
     * it and a job existing for it. Queue depth alone cannot tell a backlog
     * from a poller that stopped reading.
     */
    it("records the delay from the S3 event to the job, labelled by kind", async () => {
      const eventTime = new Date(Date.now() - 4000).toISOString();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).processMessage(
        messageWith({ eventTime, s3: { object: { key: `title-video/${TITLE}` } } }),
      );

      const text = await textOf();
      expect(text).toContain('s3_event_lag_seconds_count{kind="title-video"} 1');
      expect(text).toMatch(/s3_event_lag_seconds_sum\{kind="title-video"\} [45](\.\d+)?/);
    });

    // S3's clock and the pod's are not the same clock; a small negative skew
    // is not a measurement of anything.
    it("clamps a future event time at zero rather than recording a negative", async () => {
      const eventTime = new Date(Date.now() + 60_000).toISOString();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).processMessage(
        messageWith({ eventTime, s3: { object: { key: `title-video/${TITLE}` } } }),
      );

      expect(await textOf()).toContain('s3_event_lag_seconds_sum{kind="title-video"} 0');
    });

    it("skips the observation when the record carries no event time", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).processMessage(
        messageWith({ s3: { object: { key: `title-video/${TITLE}` } } }),
      );

      expect(await textOf()).not.toContain("s3_event_lag_seconds_count");
      expect(videoTranscoderServiceMock.scheduleTranscodeVideo).toHaveBeenCalled();
    });

    it("counts a handled message as deleted", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).processMessage(
        messageWith({ s3: { object: { key: `title-video/${TITLE}` } } }),
      );

      expect(await textOf()).toContain('sqs_messages_total{outcome="deleted"} 1');
    });

    it("counts a message that is not json as unparseable", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).processMessage({
        MessageId: "msg-2",
        ReceiptHandle: "receipt-b",
        Body: "{not json",
      });

      expect(await textOf()).toContain('sqs_messages_total{outcome="unparseable"} 1');
    });

    // A failed message is deliberately left on the queue, so this counter and
    // sqs_dlq_messages are the two ends of the same story.
    it("counts a message whose record threw as failed, and does not delete it", async () => {
      videoTranscoderServiceMock.scheduleTranscodeVideo.mockRejectedValueOnce(
        new Error("redis down"),
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).processMessage(
        messageWith({ s3: { object: { key: `title-video/${TITLE}` } } }),
      );

      expect(await textOf()).toContain('sqs_messages_total{outcome="failed"} 1');
      expect(mockSend).not.toHaveBeenCalledWith(expect.any(DeleteMessageCommand));
    });

    describe("dead-letter depth", () => {
      beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).dlqUrl = mockDlqUrl;
      });

      it("reports the approximate depth at scrape time", async () => {
        mockSend.mockResolvedValueOnce({ Attributes: { ApproximateNumberOfMessages: "3" } });

        expect(await textOf()).toContain('sqs_dlq_messages{queue="watchly-s3-events-dlq"} 3');
      });

      it("stays silent, rather than failing the scrape, when sqs cannot be read", async () => {
        mockSend.mockRejectedValueOnce(new Error("AccessDenied"));

        await expect(textOf()).resolves.toContain("sqs_messages_total");
      });
    });

    // "Unknown" must not serialise as "empty". Only the HELP and TYPE lines
    // are present; there is no sample, so nothing reads back as a zero.
    it("reports no sample when no dead-letter queue was resolved", async () => {
      expect(await textOf()).not.toMatch(/^sqs_dlq_messages[{ ]/m);
    });
  });
});
