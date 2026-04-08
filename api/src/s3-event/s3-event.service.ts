import { Event, PutBucketNotificationConfigurationCommand, S3Client } from "@aws-sdk/client-s3";
import {
  CreateQueueCommand,
  DeleteMessageCommand,
  GetQueueAttributesCommand,
  Message,
  ReceiveMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Config, S3ConfigName } from "src/config/s3.config";
import { PrismaService } from "src/prisma/prisma.service";
import { VideoType } from "src/video-transcoder/enums/video-type.enum";
import { VideoTranscoderService } from "src/video-transcoder/video-transcoder.service";

interface S3EventRecord {
  eventName: string;
  s3: {
    object: {
      key: string;
    };
  };
}

interface S3Event {
  Records?: S3EventRecord[];
}

@Injectable()
export class S3EventService implements OnModuleInit {
  private readonly logger = new Logger(S3EventService.name);
  private sqsClient: SQSClient;
  private s3Client: S3Client;
  private config: S3Config;
  private queueUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly videoTranscoderService: VideoTranscoderService,
  ) {
    this.config = this.configService.getOrThrow<S3Config>(S3ConfigName);

    const clientConfig = {
      region: this.config.region,
      endpoint: this.config.endpoint,
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
    this.startPolling();
  }

  private async setupInfrastructure() {
    try {
      const createQueueCmd = new CreateQueueCommand({ QueueName: this.config.queueName });
      const { QueueUrl } = await this.sqsClient.send(createQueueCmd);

      this.queueUrl = QueueUrl!;

      this.logger.log(`SQS Queue created/verified: ${this.queueUrl}`);

      const getAttrsCmd = new GetQueueAttributesCommand({
        QueueUrl: this.queueUrl,
        AttributeNames: ["QueueArn"],
      });

      const { Attributes } = await this.sqsClient.send(getAttrsCmd);
      const queueArn = Attributes?.QueueArn;

      if (!queueArn) throw new Error("Could not retrieve QueueArn");

      const bucketNotificationConfig = {
        Bucket: this.config.rawBucketName,
        NotificationConfiguration: {
          QueueConfigurations: [
            {
              QueueArn: queueArn,
              Events: ["s3:ObjectCreated:*" as Event],
            },
          ],
        },
      };

      await this.s3Client.send(
        new PutBucketNotificationConfigurationCommand(bucketNotificationConfig),
      );
      this.logger.log(
        `S3 Notifications configured for bucket "${this.config.rawBucketName}" -> Queue "${this.config.queueName}"`,
      );
    } catch (error) {
      this.logger.error("Failed to setup S3-SQS infrastructure", error);
    }
  }

  private startPolling() {
    setTimeout(() => {
      void this.pollLoop();
    }, 1000);
  }

  private async pollLoop() {
    while (true) {
      try {
        const receiveCmd = new ReceiveMessageCommand({
          QueueUrl: this.queueUrl,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 20,
        });

        const { Messages } = await this.sqsClient.send(receiveCmd);

        if (Messages && Messages.length > 0)
          await Promise.all(Messages.map((msg) => this.processMessage(msg)));
      } catch (error) {
        this.logger.error("Error polling SQS", error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  private async processMessage(message: Message) {
    try {
      if (!message.Body) return;

      const body = JSON.parse(message.Body) as S3Event;
      if (body.Records) {
        for (const record of body.Records) {
          const eventName = record.eventName;
          const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

          if (eventName.startsWith("s3:TestEvent")) continue;

          this.logger.log(`Received S3 Event: ${eventName} for ${key}`);

          const id = key;

          const episode = await this.prisma.episode.findUnique({ where: { id } });
          if (episode) {
            this.logger.log(`Detected upload for Episode ${id}. Starting transcoding...`);
            await this.videoTranscoderService.scheduleTranscodeVideo({
              id,
              type: VideoType.EPISODE,
            });
            continue;
          }

          const title = await this.prisma.title.findUnique({ where: { id } });
          if (title) {
            this.logger.log(`Detected upload for Movie ${id}. Starting transcoding...`);
            await this.videoTranscoderService.scheduleTranscodeVideo({
              id,
              type: VideoType.MOVIE,
            });
            continue;
          }

          this.logger.warn(`Uploaded file ${id} does not match any known Episode or Movie.`);
        }
      }

      await this.sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: this.queueUrl,
          ReceiptHandle: message.ReceiptHandle,
        }),
      );
    } catch (error) {
      this.logger.error(`Error processing message ${message.MessageId ?? "unknown"}`, error);
    }
  }
}
