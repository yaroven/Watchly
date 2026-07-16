import { PutBucketNotificationConfigurationCommand } from "@aws-sdk/client-s3";
import {
  CreateQueueCommand,
  DeleteMessageCommand,
  GetQueueAttributesCommand,
  SetQueueAttributesCommand,
} from "@aws-sdk/client-sqs";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
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
const mockQueueArn = "arn:aws:sqs:us-east-1:123:watchly-s3-events";

describe("S3EventService", () => {
  let service: S3EventService;
  let prismaMock: jest.Mocked<PrismaService>;
  let videoTranscoderServiceMock: jest.Mocked<VideoTranscoderService>;

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

    // Override the real SQS/S3 clients with a stub that shares one mockSend
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).sqsClient = { send: mockSend };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).s3Client = { send: mockSend };
    // Inject fake queueUrl so pollLoop/setupInfrastructure can use it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).queueUrl = mockQueueUrl;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("setupInfrastructure", () => {
    beforeEach(() => {
      mockSend
        .mockResolvedValueOnce({ QueueUrl: mockQueueUrl })
        .mockResolvedValueOnce({ Attributes: { QueueArn: mockQueueArn } })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});
    });

    test("should create SQS queue", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).setupInfrastructure();

      expect(mockSend).toHaveBeenCalledWith(expect.any(CreateQueueCommand));
    });

    test("should fetch queue ARN via GetQueueAttributes", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).setupInfrastructure();

      expect(mockSend).toHaveBeenCalledWith(expect.any(GetQueueAttributesCommand));
    });

    test("should set queue policy allowing S3 to send messages", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).setupInfrastructure();

      const policyCall = mockSend.mock.calls.find(
        (call) => call[0] instanceof SetQueueAttributesCommand,
      );
      expect(policyCall).toBeDefined();
      const attrs = policyCall[0].input.Attributes;
      const policy = JSON.parse(attrs.Policy);
      expect(policy.Statement[0].Effect).toBe("Allow");
      expect(policy.Statement[0].Principal.Service).toBe("s3.amazonaws.com");
    });

    test("should subscribe S3 bucket to queue", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).setupInfrastructure();

      const notifCall = mockSend.mock.calls.find(
        (call) => call[0] instanceof PutBucketNotificationConfigurationCommand,
      );
      expect(notifCall).toBeDefined();
      expect(notifCall[0].input.Bucket).toBe("watchly-raw");
      expect(notifCall[0].input.NotificationConfiguration.QueueConfigurations[0].QueueArn).toBe(
        mockQueueArn,
      );
    });
  });

  describe("resolveTask", () => {
    test("should return EPISODE task when episode exists", async () => {
      (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue({
        id: "11111111-1111-4111-8111-111111111111",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (service as any).resolveTask("11111111-1111-4111-8111-111111111111");

      expect(result).toEqual({
        id: "11111111-1111-4111-8111-111111111111",
        type: VideoType.EPISODE,
      });
      expect(prismaMock.title.findUnique).not.toHaveBeenCalled();
    });

    test("should return MOVIE task when episode not found but title exists", async () => {
      (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaMock.title.findUnique as jest.Mock).mockResolvedValue({
        id: "22222222-2222-4222-8222-222222222222",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (service as any).resolveTask("22222222-2222-4222-8222-222222222222");

      expect(result).toEqual({ id: "22222222-2222-4222-8222-222222222222", type: VideoType.MOVIE });
    });

    test("should return null when neither episode nor title exists", async () => {
      (prismaMock.episode.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaMock.title.findUnique as jest.Mock).mockResolvedValue(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (service as any).resolveTask("33333333-3333-4333-8333-333333333333");

      expect(result).toBeNull();
    });
  });

  describe("processMessage", () => {
    test("should process valid episode message and schedule transcode", async () => {
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

    test("should process valid title (movie) message and schedule transcode", async () => {
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

    test("should delete message with no Records instead of leaving it in the queue", async () => {
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

    test("should skip scheduling when task resolution returns null", async () => {
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

    test("should delete message only after successful processing", async () => {
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

    test("should delete unparseable (poison-pill) messages instead of retrying forever", async () => {
      const message = {
        MessageId: "msg-1",
        ReceiptHandle: "receipt-error",
        Body: "invalid json",
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).processMessage(message);

      expect(mockSend.mock.calls[0][0]).toBeInstanceOf(DeleteMessageCommand);
    });

    test("should not delete message when processing a valid message throws", async () => {
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

    test("should decode percent-encoded characters in S3 key before matching", async () => {
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

    test("should skip non-UUID S3 keys without querying the database", async () => {
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
