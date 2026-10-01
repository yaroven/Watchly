import { DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { UserAvatarService } from "../user-avatar/user-avatar.service";
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
const mockQueueArn = "arn:aws:sqs:us-east-1:123:watchly-s3-events";
const mockDlqUrl = "https://sqs.us-east-1.amazonaws.com/123/watchly-s3-events-dlq";
const mockDlqArn = "arn:aws:sqs:us-east-1:123:watchly-s3-events-dlq";

describe("S3EventService", () => {
  let service: S3EventService;
  let prismaMock: jest.Mocked<PrismaService>;
  let videoTranscoderServiceMock: jest.Mocked<VideoTranscoderService>;
  let userAvatarServiceMock: { scheduleProcessing: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

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
          provide: UserAvatarService,
          useValue: { scheduleProcessing: jest.fn() },
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
    userAvatarServiceMock = module.get(UserAvatarService);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).sqsClient = { send: mockSend };
    // Inject fake queueUrl so pollLoop can use it
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

  /**
   * The key says what the object is. Before this the kind was inferred by
   * probing for an episode and then a title, so a new kind of raw object was
   * indistinguishable from a stale one.
   */
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

    it("should hand an avatar to the avatar queue, not the transcoder", async () => {
      const key = `user-avatar/${USER_ID}/abc-123`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).processMessage(messageFor(key));

      expect(userAvatarServiceMock.scheduleProcessing).toHaveBeenCalledWith({
        userId: USER_ID,
        rawKey: key,
      });
      expect(videoTranscoderServiceMock.scheduleTranscodeVideo).not.toHaveBeenCalled();
    });

    // Dropping it is right; retrying forever on something this build cannot
    // name would block the queue behind it.
    it("should ignore a prefix it does not recognise, and still delete the message", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).processMessage(messageFor("something-else/abc"));

      expect(videoTranscoderServiceMock.scheduleTranscodeVideo).not.toHaveBeenCalled();
      expect(userAvatarServiceMock.scheduleProcessing).not.toHaveBeenCalled();
      expect(mockSend.mock.calls[0][0]).toBeInstanceOf(DeleteMessageCommand);
    });

    // An upload started before the scheme shipped is still a bare uuid, and
    // dropping it would lose a video somebody is waiting on.
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
});
