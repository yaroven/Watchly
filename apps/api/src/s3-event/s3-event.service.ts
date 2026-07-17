import { PutBucketNotificationConfigurationCommand, S3Client } from "@aws-sdk/client-s3";
import {
  CreateQueueCommand,
  DeleteMessageCommand,
  GetQueueAttributesCommand,
  GetQueueUrlCommand,
  Message,
  QueueNameExists,
  ReceiveMessageCommand,
  SQSClient,
  SetQueueAttributesCommand,
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
  private s3Client: S3Client;
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
    const clientConfig = {
      region: this.config.region,
      endpoint: this.config.internalEndpoint,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    };
    this.sqsClient = new SQSClient(clientConfig);
    this.s3Client = new S3Client({ ...clientConfig, forcePathStyle: true });
  }

  async onModuleInit() {
    await this.setupInfrastructure();
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
   * SQS CreateQueue is only idempotent when the requested attributes match an
   * existing queue's exactly (e.g. the DLQ's ARN can change across restarts
   * of a persisted LocalStack volume) — a mismatch throws QueueNameExists
   * instead of returning the existing queue. Fall back to looking the queue
   * up by name and reconciling its attributes so setup is idempotent across
   * restarts.
   */
  private async getOrCreateQueue(
    name: string,
    attributes?: Record<string, string>,
  ): Promise<string> {
    try {
      const { QueueUrl } = await this.sqsClient.send(
        new CreateQueueCommand({ QueueName: name, Attributes: attributes }),
      );
      return QueueUrl!;
    } catch (error) {
      if (!(error instanceof QueueNameExists)) throw error;

      const { QueueUrl } = await this.sqsClient.send(new GetQueueUrlCommand({ QueueName: name }));
      if (attributes) {
        await this.sqsClient.send(
          new SetQueueAttributesCommand({ QueueUrl: QueueUrl!, Attributes: attributes }),
        );
      }
      return QueueUrl!;
    }
  }

  private async setupInfrastructure() {
    const dlqUrl = await this.getOrCreateQueue(`${this.config.queueName}-dlq`);
    const { Attributes: dlqAttributes } = await this.sqsClient.send(
      new GetQueueAttributesCommand({
        QueueUrl: dlqUrl,
        AttributeNames: ["QueueArn"],
      }),
    );
    const dlqArn = dlqAttributes?.QueueArn;

    this.queueUrl = await this.getOrCreateQueue(this.config.queueName, {
      RedrivePolicy: JSON.stringify({
        deadLetterTargetArn: dlqArn,
        maxReceiveCount: 5,
      }),
    });

    const { Attributes } = await this.sqsClient.send(
      new GetQueueAttributesCommand({
        QueueUrl: this.queueUrl,
        AttributeNames: ["QueueArn"],
      }),
    );
    const queueArn = Attributes?.QueueArn;

    await this.sqsClient.send(
      new SetQueueAttributesCommand({
        QueueUrl: this.queueUrl,
        Attributes: {
          Policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: { Service: "s3.amazonaws.com" },
                Action: "sqs:SendMessage",
                Resource: queueArn,
              },
            ],
          }),
        },
      }),
    );

    await this.s3Client.send(
      new PutBucketNotificationConfigurationCommand({
        Bucket: this.config.rawBucketName,
        NotificationConfiguration: {
          QueueConfigurations: [{ QueueArn: queueArn!, Events: ["s3:ObjectCreated:*"] }],
        },
      }),
    );
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
