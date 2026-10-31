import {
  DeleteMessageCommand,
  GetQueueAttributesCommand,
  GetQueueUrlCommand,
  Message,
  ReceiveMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Counter, Gauge, Histogram } from "prom-client";
import { S3Config, S3ConfigName } from "../../config/s3.config";
import { Logged } from "../../decorators/logged.decorator";
import { imageKindOfRawKind } from "../image/utils/image-target.const";
import { videoTypeOfRawKind } from "../media-asset/utils/video-location.util";
import { PrismaService } from "../prisma/prisma.service";
import { ImageTranscodeScheduler } from "../queues/image-transcoder/image-transcode-scheduler.service";
import { VideoType } from "../queues/video-transcoder/enums/video-type.enum";
import { VideoTranscodeScheduler } from "../queues/video-transcoder/video-transcode-scheduler.service";
import { isLegacyBareUuidKey, parseRawKey, RawObjectKind } from "../s3/raw-key";

interface S3EventRecord {
  eventTime?: string;
  s3: { object: { key: string } };
}

interface S3EventBody {
  Records?: S3EventRecord[];
}

const lag = new Histogram({
  name: "s3_event_lag_seconds",
  help: "Delay from the S3 event to the transcode job being scheduled",
  labelNames: ["kind"],
  buckets: [0.5, 1, 2.5, 5, 10, 30, 60, 300],
});

const messages = new Counter({
  name: "sqs_messages_total",
  help: "SQS messages handled, by what became of them",
  labelNames: ["outcome"],
});

let dlqSampler: (() => Promise<void>) | undefined;

const dlqMessages = new Gauge({
  name: "sqs_dlq_messages",
  help: "Approximate messages sitting in the S3 event dead-letter queue",
  labelNames: ["queue"],
  collect: async () => {
    await dlqSampler?.();
  },
});

@Injectable()
export class S3EventService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(S3EventService.name);
  private sqsClient: SQSClient;
  private config: S3Config;
  private queueUrl: string;
  private dlqUrl?: string;
  private isShuttingDown = false;
  private readonly shutdownController = new AbortController();
  private pollLoopFinished: Promise<void> = Promise.resolve();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly videoScheduler: VideoTranscodeScheduler,
    private readonly imageTranscodeScheduler: ImageTranscodeScheduler,
  ) {
    this.config = this.configService.getOrThrow<S3Config>(S3ConfigName);
    dlqSampler = () => this.sampleDlq();

    const credentials = {
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey,
    };

    this.sqsClient = new SQSClient({
      region: this.config.region,
      credentials,
      ...(this.config.sqsEndpoint ? { endpoint: this.config.sqsEndpoint } : {}),
    });
  }

  @Logged()
  async onModuleInit() {
    if (!this.config.eventsEnabled) return;

    this.queueUrl = await this.resolveQueueUrl();
    this.dlqUrl = await this.resolveDlqUrl();
    this.pollLoopFinished = this.runPollLoop();
  }

  @Logged()
  private async runPollLoop(): Promise<void> {
    try {
      await this.pollLoop();
    } catch {
      // @Logged has already logged this failure
    }
  }

  @Logged()
  private async resolveDlqUrl(): Promise<string | undefined> {
    try {
      return await this.queueUrlOf(this.dlqName());
    } catch {
      // @Logged has already logged this failure
      return undefined;
    }
  }

  @Logged({ failedLevel: "warn" })
  private async queueUrlOf(queueName: string): Promise<string> {
    const { QueueUrl } = await this.sqsClient.send(
      new GetQueueUrlCommand({ QueueName: queueName }),
    );
    return QueueUrl!;
  }

  @Logged({ completedLevel: "debug" })
  private async sampleDlq(): Promise<void> {
    if (!this.dlqUrl) return;

    let depth: number;
    try {
      depth = await this.readDlqDepth(this.dlqUrl);
    } catch {
      // @Logged has already logged this failure
      return;
    }

    dlqMessages.set({ queue: this.dlqName() }, depth);
  }

  @Logged({ completedLevel: "debug" })
  private async readDlqDepth(dlqUrl: string): Promise<number> {
    const { Attributes } = await this.sqsClient.send(
      new GetQueueAttributesCommand({
        QueueUrl: dlqUrl,
        AttributeNames: ["ApproximateNumberOfMessages"],
      }),
    );
    return Number(Attributes?.ApproximateNumberOfMessages ?? 0);
  }

  private dlqName(): string {
    return `${this.config.queueName}-dlq`;
  }

  @Logged()
  async onModuleDestroy() {
    this.isShuttingDown = true;
    this.shutdownController.abort();
    await this.pollLoopFinished;
  }

  @Logged()
  private async resolveQueueUrl(): Promise<string> {
    try {
      return await this.queueUrlOf(this.config.queueName);
    } catch (error) {
      throw new Error(
        `Queue "${this.config.queueName}" does not exist. It is part of the environment, not something this service creates — provision it, or set S3_EVENTS_ENABLED=false to run without the event path.`,
        { cause: error },
      );
    }
  }

  @Logged()
  private async pollLoop() {
    while (!this.isShuttingDown) {
      try {
        for (const msg of await this.receive()) {
          if (this.isShuttingDown) break;
          await this.processMessage(msg);
        }
      } catch {
        if (this.isShuttingDown) break;
        await new Promise((res) => setTimeout(res, 5000));
      }
    }
  }

  @Logged({ completedLevel: "debug" })
  private async receive(): Promise<Message[]> {
    try {
      const { Messages } = await this.sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: this.queueUrl,
          MaxNumberOfMessages: 5,
          WaitTimeSeconds: 20, // Long polling
        }),
        { abortSignal: this.shutdownController.signal },
      );
      return Messages ?? [];
    } catch (error) {
      if (this.isShuttingDown) return [];
      throw error;
    }
  }

  @Logged({ completedLevel: "debug" })
  private async processMessage(message: Message) {
    let body: S3EventBody;
    try {
      body = this.parseBody(message);
    } catch {
      messages.inc({ outcome: "unparseable" });
      await this.deleteMessage(message);
      return;
    }

    if (!body.Records) {
      messages.inc({ outcome: "no_records" });
      await this.deleteMessage(message);
      return;
    }

    const results = await Promise.allSettled(
      body.Records.map((record) => this.processRecord(record)),
    );

    const failed = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );

    if (failed.length > 0) {
      messages.inc({ outcome: "failed" });
      return;
    }

    messages.inc({ outcome: "deleted" });
    await this.deleteMessage(message);
  }

  @Logged({ completedLevel: "debug" })
  private parseBody(message: Message): S3EventBody {
    return JSON.parse(message.Body!) as S3EventBody;
  }

  @Logged()
  private async processRecord(record: S3EventRecord) {
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    const parsed = parseRawKey(key);

    if (!parsed) {
      await this.processLegacyRecord(key);
      return;
    }

    this.observeLag(record, parsed.kind);

    const imageKind = imageKindOfRawKind(parsed.kind);
    if (imageKind !== undefined) {
      await this.imageTranscodeScheduler.schedule({
        kind: imageKind,
        ownerId: parsed.ownerId,
        rawKey: key,
      });
      return;
    }

    const videoType = videoTypeOfRawKind(parsed.kind);
    if (videoType !== undefined) {
      await this.videoScheduler.schedule({ id: parsed.ownerId, type: videoType, rawKey: key });
      return;
    }

    throw new Error(`No scheduler for raw object kind "${parsed.kind}"`);
  }

  private observeLag(record: S3EventRecord, kind: RawObjectKind): void {
    if (!record.eventTime) return;

    const eventAt = Date.parse(record.eventTime);
    if (Number.isNaN(eventAt)) return;

    lag.observe({ kind }, Math.max(0, (Date.now() - eventAt) / 1000));
  }

  @Logged()
  private async processLegacyRecord(key: string) {
    if (!isLegacyBareUuidKey(key)) {
      this.logger.warn(`Skipping S3 event for unrecognised object key "${key}"`);
      return;
    }

    const task = await this.resolveLegacyTask(key);
    if (!task) {
      this.logger.warn(`No title or episode found for uploaded object "${key}"`);
      return;
    }

    await this.videoScheduler.schedule({ ...task, rawKey: key });
  }

  @Logged({ completedLevel: "debug" })
  private async deleteMessage(message: Message) {
    await this.sqsClient.send(
      new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: message.ReceiptHandle,
      }),
    );
  }

  @Logged()
  private async resolveLegacyTask(id: string) {
    const episode = await this.prisma.episode.findUnique({ where: { id } });
    if (episode) return { id, type: VideoType.EPISODE };

    const title = await this.prisma.title.findUnique({ where: { id } });
    if (title) return { id, type: VideoType.MOVIE };

    return null;
  }
}
