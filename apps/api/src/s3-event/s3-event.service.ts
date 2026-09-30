import {
  DeleteMessageCommand,
  GetQueueUrlCommand,
  Message,
  ReceiveMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Config, S3ConfigName } from "../config/s3.config";
import { PrismaService } from "../prisma/prisma.service";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { VideoTranscoderService } from "../video-transcoder/video-transcoder.service";

@Injectable()
export class S3EventService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(S3EventService.name);
  private sqsClient: SQSClient;
  private config: S3Config;
  private queueUrl: string;
  private isShuttingDown = false;
  private readonly shutdownController = new AbortController();
  private pollLoopFinished: Promise<void> = Promise.resolve();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly videoTranscoderService: VideoTranscoderService,
  ) {
    this.config = this.configService.getOrThrow<S3Config>(S3ConfigName);
    const credentials = {
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey,
    };

    // No endpoint override against real AWS: SQS lives at
    // sqs.<region>.amazonaws.com. LocalStack serves it from the same port as
    // S3, which is what sqsEndpoint is for.
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
    this.pollLoopFinished = this.pollLoop().catch((err) =>
      this.logger.error("Critical polling error", err),
    );
  }

  async onModuleDestroy() {
    this.logger.log("Stopping S3 polling...");
    this.isShuttingDown = true;
    this.shutdownController.abort();
    await this.pollLoopFinished;
  }

  /**
   * The queue is provisioned with the rest of the infrastructure — by the
   * LocalStack init script locally, by whatever manages the cloud account in
   * dev and prod. Looking it up rather than creating it keeps this service's
   * credentials down to receiving and deleting messages.
   */
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
    let body: { Records?: { s3: { object: { key: string } } }[] };
    try {
      body = JSON.parse(message.Body!) as { Records?: { s3: { object: { key: string } } }[] };
    } catch (error) {
      this.logger.error(
        `Discarding unparseable SQS message ${message.MessageId}: ${message.Body}`,
        error,
      );
      await this.deleteMessage(message);
      return;
    }

    if (!body.Records) {
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
      return;
    }

    await this.deleteMessage(message);
  }

  private async processRecord(record: { s3: { object: { key: string } } }) {
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    if (!this.isUuid(key)) {
      this.logger.warn(`Skipping S3 event for non-UUID object key "${key}"`);
      return;
    }

    const task = await this.resolveTask(key);
    if (task) {
      await this.videoTranscoderService.scheduleTranscodeVideo(task);
    } else {
      this.logger.warn(`No title or episode found for uploaded object "${key}"`);
    }
  }

  private async deleteMessage(message: Message) {
    await this.sqsClient.send(
      new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: message.ReceiptHandle,
      }),
    );
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  private async resolveTask(id: string) {
    const episode = await this.prisma.episode.findUnique({ where: { id } });
    if (episode) return { id, type: VideoType.EPISODE };

    const title = await this.prisma.title.findUnique({ where: { id } });
    if (title) return { id, type: VideoType.MOVIE };

    return null;
  }
}
