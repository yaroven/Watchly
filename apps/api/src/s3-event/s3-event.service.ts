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
import { S3Config, S3ConfigName } from "../config/s3.config";
import { ImageKind } from "../image-transcoder/image-profile.const";
import { ImageTranscodeScheduler } from "../image-transcoder/image-transcode-scheduler.service";
import { PrismaService } from "../prisma/prisma.service";
import { isLegacyBareUuidKey, parseRawKey, RawObjectKind } from "../s3/raw-key";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { VideoTranscodeScheduler } from "../video-transcoder/video-transcode-scheduler.service";

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

  async onModuleInit() {
    if (!this.config.eventsEnabled) {
      this.logger.log("S3 events disabled — transcodes are scheduled on upload completion instead");
      return;
    }

    this.queueUrl = await this.resolveQueueUrl();
    this.dlqUrl = await this.resolveDlqUrl();
    this.pollLoopFinished = this.pollLoop().catch((err) =>
      this.logger.error("Critical polling error", err),
    );
  }

  /**
   * Non-fatal, unlike the main queue. The dead-letter queue is a monitoring
   * convenience; the service has a job to do without it, and a cloud account
   * may well have named it something else.
   */
  private async resolveDlqUrl(): Promise<string | undefined> {
    const queueName = this.dlqName();

    try {
      const { QueueUrl } = await this.sqsClient.send(
        new GetQueueUrlCommand({ QueueName: queueName }),
      );
      return QueueUrl;
    } catch {
      this.logger.warn(`No dead-letter queue "${queueName}" — sqs_dlq_messages stays unreported`);
      return undefined;
    }
  }

  /**
   * Swallows its own failure: `registry.metrics()` rejects as a whole if a
   * collector throws, so an SQS hiccup here would blank out every other
   * metric in the process.
   */
  private async sampleDlq(): Promise<void> {
    if (!this.dlqUrl) return;

    try {
      const { Attributes } = await this.sqsClient.send(
        new GetQueueAttributesCommand({
          QueueUrl: this.dlqUrl,
          AttributeNames: ["ApproximateNumberOfMessages"],
        }),
      );

      dlqMessages.set(
        { queue: this.dlqName() },
        Number(Attributes?.ApproximateNumberOfMessages ?? 0),
      );
    } catch (error) {
      this.logger.error("Failed to read the dead-letter queue depth", error);
    }
  }

  private dlqName(): string {
    return `${this.config.queueName}-dlq`;
  }

  async onModuleDestroy() {
    this.logger.log("Stopping S3 polling...");
    this.isShuttingDown = true;
    this.shutdownController.abort();
    await this.pollLoopFinished;
  }

  private async resolveQueueUrl(): Promise<string> {
    try {
      const { QueueUrl } = await this.sqsClient.send(
        new GetQueueUrlCommand({ QueueName: this.config.queueName }),
      );
      return QueueUrl!;
    } catch (error) {
      throw new Error(
        `Queue "${this.config.queueName}" does not exist. It is part of the environment, not something this service creates — provision it, or set S3_EVENTS_ENABLED=false to run without the event path.`,
        { cause: error },
      );
    }
  }

  private async pollLoop() {
    this.logger.log("S3 Polling started...");
    while (!this.isShuttingDown) {
      try {
        const { Messages } = await this.sqsClient.send(
          new ReceiveMessageCommand({
            QueueUrl: this.queueUrl,
            MaxNumberOfMessages: 5,
            WaitTimeSeconds: 20, // Long polling
          }),
          { abortSignal: this.shutdownController.signal },
        );

        if (Messages) {
          for (const msg of Messages) {
            if (this.isShuttingDown) break;
            await this.processMessage(msg);
          }
        }
      } catch (error) {
        if (this.isShuttingDown) break;
        this.logger.error("Polling error", error);
        await new Promise((res) => setTimeout(res, 5000));
      }
    }
    this.logger.log("S3 polling stopped.");
  }

  private async processMessage(message: Message) {
    let body: S3EventBody;
    try {
      body = JSON.parse(message.Body!) as S3EventBody;
    } catch (error) {
      this.logger.error(
        `Discarding unparseable SQS message ${message.MessageId}: ${message.Body}`,
        error,
      );
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
      for (const { reason } of failed) {
        this.logger.error(`Failed to process record in message ${message.MessageId}`, reason);
      }
      // Left on the queue on purpose: SQS redelivers, and after five rounds
      // the RedrivePolicy moves it to the queue sqs_dlq_messages watches.
      messages.inc({ outcome: "failed" });
      return;
    }

    messages.inc({ outcome: "deleted" });
    await this.deleteMessage(message);
  }

  private async processRecord(record: S3EventRecord) {
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    const parsed = parseRawKey(key);

    if (!parsed) {
      await this.processLegacyRecord(key);
      return;
    }

    this.observeLag(record, parsed.kind);

    switch (parsed.kind) {
      case RawObjectKind.TITLE_VIDEO:
        await this.videoScheduler.schedule({
          id: parsed.ownerId,
          type: VideoType.MOVIE,
        });
        return;
      case RawObjectKind.EPISODE_VIDEO:
        await this.videoScheduler.schedule({
          id: parsed.ownerId,
          type: VideoType.EPISODE,
        });
        return;
      case RawObjectKind.USER_AVATAR:
        await this.scheduleImage(ImageKind.USER_AVATAR, parsed.ownerId, key);
        return;
      case RawObjectKind.TITLE_POSTER:
        await this.scheduleImage(ImageKind.TITLE_POSTER, parsed.ownerId, key);
        return;
      case RawObjectKind.SEASON_POSTER:
        await this.scheduleImage(ImageKind.SEASON_POSTER, parsed.ownerId, key);
        return;
      case RawObjectKind.ARTIST_PHOTO:
        await this.scheduleImage(ImageKind.ARTIST_PHOTO, parsed.ownerId, key);
        return;
    }
  }

  private async scheduleImage(kind: ImageKind, ownerId: string, rawKey: string) {
    await this.imageTranscodeScheduler.schedule({ kind, ownerId, rawKey });
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

    this.logger.warn(`Resolved "${key}" by database probe — it predates the raw key scheme`);
    await this.videoScheduler.schedule(task);
  }

  private async deleteMessage(message: Message) {
    await this.sqsClient.send(
      new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: message.ReceiptHandle,
      }),
    );
  }

  private async resolveLegacyTask(id: string) {
    const episode = await this.prisma.episode.findUnique({ where: { id } });
    if (episode) return { id, type: VideoType.EPISODE };

    const title = await this.prisma.title.findUnique({ where: { id } });
    if (title) return { id, type: VideoType.MOVIE };

    return null;
  }
}
