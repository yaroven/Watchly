import { PutBucketNotificationConfigurationCommand, S3Client } from "@aws-sdk/client-s3";
import {
  CreateQueueCommand,
  DeleteMessageCommand,
  GetQueueAttributesCommand,
  Message,
  ReceiveMessageCommand,
  SQSClient,
  SetQueueAttributesCommand,
} from "@aws-sdk/client-sqs";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Config, S3ConfigName } from "../config/s3.config";
import { PrismaService } from "../prisma/prisma.service";
import { VideoType } from "../video-transcoder/enums/video-type.enum";
import { VideoTranscoderService } from "../video-transcoder/video-transcoder.service";

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
    // Запускаємо цикл в фоні
    this.pollLoop().catch((err) => this.logger.error("Critical polling error", err));
  }

  private async setupInfrastructure() {
    // 1. Створюємо чергу
    const { QueueUrl } = await this.sqsClient.send(
      new CreateQueueCommand({ QueueName: this.config.queueName }),
    );
    this.queueUrl = QueueUrl!;

    // 2. Отримуємо ARN для політики та нотифікацій
    const { Attributes } = await this.sqsClient.send(
      new GetQueueAttributesCommand({
        QueueUrl: this.queueUrl,
        AttributeNames: ["QueueArn"],
      }),
    );
    const queueArn = Attributes?.QueueArn;

    // 3. Даємо дозвіл S3 писати в SQS
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

    // 4. Підписуємо бакет на події
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
    while (true) {
      try {
        const { Messages } = await this.sqsClient.send(
          new ReceiveMessageCommand({
            QueueUrl: this.queueUrl,
            MaxNumberOfMessages: 5,
            WaitTimeSeconds: 20, // Long polling
          }),
        );

        if (Messages) {
          for (const msg of Messages) {
            await this.processMessage(msg);
          }
        }
      } catch (error) {
        this.logger.error("Polling error", error);
        await new Promise((res) => setTimeout(res, 5000));
      }
    }
  }

  private async processMessage(message: Message) {
    try {
      const body = JSON.parse(message.Body!);
      if (!body.Records) return;

      for (const record of body.Records) {
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

        // Ідемпотентність: перевіряємо статус в БД
        const task = await this.resolveTask(key);
        if (task) {
          // Якщо завдання вже в процесі, сервіс має ігнорувати повторні запити
          await this.videoTranscoderService.scheduleTranscodeVideo(task);
        }
      }

      // ВИДАЛЯЄМО лише після успішної обробки
      await this.sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: this.queueUrl,
          ReceiptHandle: message.ReceiptHandle,
        }),
      );
    } catch (error) {
      this.logger.error("Failed to process message", error);
      // Якщо тут помилка, ми НЕ видаляємо повідомлення,
      // воно повернеться в чергу через visibilityTimeout
    }
  }

  private async resolveTask(id: string) {
    const episode = await this.prisma.episode.findUnique({ where: { id } });
    if (episode) return { id, type: VideoType.EPISODE };

    const title = await this.prisma.title.findUnique({ where: { id } });
    if (title) return { id, type: VideoType.MOVIE };

    return null;
  }
}
