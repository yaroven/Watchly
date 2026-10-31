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
import { PrismaService } from "../prisma/prisma.service";
import { ImageTranscodeScheduler } from "../queues/image-transcoder/image-transcode-scheduler.service";
import { VideoType } from "../queues/video-transcoder/enums/video-type.enum";
import { VideoTranscodeScheduler } from "../queues/video-transcoder/video-transcode-scheduler.service";
import {
  imageKindOf,
  isLegacyBareUuidKey,
  parseRawKey,
  RawObjectKind,
  videoTypeOf,
} from "../s3/raw-key";

interface S3EventRecord {
  eventTime?: string;
  s3: { object: { key: string } };
}

interface S3EventBody {
  Records?: S3EventRecord[];
}

/**
 * End to end: how long an upload waits between S3 accepting it and a job
 * existing for it. One number for "is the pipeline keeping up" — queue depth
 * cannot distinguish a backlog from a poller that stopped reading.
 */
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

/**
 * Reaching the live service through a holder, because `collect` runs on the
 * metric and has no instance to read the SQS client from. Set by the
 * constructor, replaced rather than added to, so building the service twice —
 * which happens in tests — leaves one sampler.
 */
let dlqSampler: (() => Promise<void>) | undefined;

/**
 * Nothing watched this before. A record that fails five times leaves the main
 * queue for the dead-letter one (see the RedrivePolicy in
 * localstack-init/provision.sh) and the upload silently never appears.
 *
 * Sampled at scrape time, which costs one GetQueueAttributes call per scrape
 * rather than a poller of its own.
 */
const dlqMessages = new Gauge({
  name: "sqs_dlq_messages",
  help: "Approximate messages sitting in the S3 event dead-letter queue",
  // Labelled so the series does not exist until something is written to it.
  // An unlabelled gauge reports 0 from the moment it is registered, which
  // would say "the dead-letter queue is empty" when the truth is "the queue
  // was never resolved" — and an alert on > 0 would then never fire.
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

  /**
   * Non-fatal, unlike the main queue. The dead-letter queue is a monitoring
   * convenience; the service has a job to do without it, and a cloud account
   * may well have named it something else.
   */
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

  /**
   * Swallows its own failure: `registry.metrics()` rejects as a whole if a
   * collector throws, so an SQS hiccup here would blank out every other
   * metric in the process.
   */
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
      // Left on the queue on purpose: SQS redelivers, and after five rounds
      // the RedrivePolicy moves it to the queue sqs_dlq_messages watches.
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

    const imageKind = imageKindOf(parsed.kind);
    if (imageKind !== undefined) {
      await this.imageTranscodeScheduler.schedule({
        kind: imageKind,
        ownerId: parsed.ownerId,
        rawKey: key,
      });
      return;
    }

    // Compared against undefined, never for truthiness: VideoType is a numeric
    // enum and VideoType.MOVIE is 0.
    const videoType = videoTypeOf(parsed.kind);
    if (videoType !== undefined) {
      await this.videoScheduler.schedule({ id: parsed.ownerId, type: videoType });
      return;
    }

    // Thrown rather than logged so the message is left on the queue: a kind
    // with no scheduler is a deployment that forgot one, and five redeliveries
    // later it lands in the dead-letter queue sqs_dlq_messages watches. The
    // switch this replaced fell through silently and the upload vanished.
    throw new Error(`No scheduler for raw object kind "${parsed.kind}"`);
  }

  /**
   * Clamped at zero: `eventTime` comes from S3's clock and this one from the
   * pod's, so a small negative skew is expected and is not a measurement.
   */
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

    await this.videoScheduler.schedule(task);
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
