import {
  BucketAlreadyExists,
  BucketAlreadyOwnedByYou,
  CreateBucketCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  NotFound,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { sdkStreamMixin } from "@aws-sdk/util-stream-node";
import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Readable } from "stream";
import { S3Config, S3ConfigName } from "../config/s3.config";
import BucketType from "./enums/bucket-type.enum";

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private s3Config: S3Config;
  private s3Client: S3Client;
  private processedBucketName: string;
  private rawBucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.s3Config = configService.getOrThrow<S3Config>(S3ConfigName);
    this.rawBucketName = this.s3Config.rawBucketName;
    this.processedBucketName = this.s3Config.processedBucketName;

    this.s3Client = new S3Client({
      region: this.s3Config.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.s3Config.accessKeyId,
        secretAccessKey: this.s3Config.secretAccessKey,
      },
      endpoint: this.s3Config.internalEndpoint,
    });
  }

  private mapSignedUrlToPublicEndpoint(url: string) {
    const signedUrl = new URL(url);
    const publicEndpoint = new URL(this.s3Config.publicEndpoint);

    signedUrl.protocol = publicEndpoint.protocol;
    signedUrl.hostname = publicEndpoint.hostname;
    signedUrl.port = publicEndpoint.port;

    return signedUrl.toString();
  }

  async onModuleInit() {
    await this.initializeBucketWithRetry(this.rawBucketName);
    await this.initializeBucketWithRetry(this.processedBucketName);
  }

  private async initializeBucketWithRetry(bucketName: string, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        await this.initializeBucket(bucketName);
        return;
      } catch (error) {
        if (i === retries - 1) throw error;
        this.logger.warn(`Failed to initialize bucket "${bucketName}". Retrying in 2 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  private async initializeBucket(bucketName: string) {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
      this.logger.log(`Bucket "${bucketName}" verified.`);
    } catch (error: any) {
      if (error instanceof NotFound) {
        this.logger.log(`Bucket "${bucketName}" not found. Creating it now...`);
        return this.createBucket(bucketName);
      }

      this.logger.error(`Unexpected Error: ${error}`);
      throw new InternalServerErrorException(
        "An unexpected error occurred during S3 initialization",
      );
    }
  }
  private async createBucket(bucketName: string) {
    try {
      await this.s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
      this.logger.log(`Bucket "${bucketName}" created successfully.`);
    } catch (createError) {
      if (
        createError instanceof BucketAlreadyOwnedByYou ||
        createError instanceof BucketAlreadyExists
      ) {
        this.logger.log(`Bucket "${bucketName}" was created by another process.`);
        return;
      }

      this.logger.error(
        `Failed to create bucket: ${createError instanceof Error ? createError.message : createError}`,
      );
      throw new InternalServerErrorException(`Failed to create bucket: ${bucketName}`);
    }
  }

  private getBucketName(type: BucketType): string {
    const cfg = this.configService.getOrThrow<S3Config>(S3ConfigName);
    return type === BucketType.RAW ? cfg.rawBucketName : cfg.processedBucketName;
  }

  async get(key: string, type: BucketType): Promise<Readable> {
    const response = await this.s3Client.send(
      new GetObjectCommand({ Bucket: this.getBucketName(type), Key: key }),
    );
    return response.Body as Readable;
  }

  async getFileBuffer(key: string, type: BucketType) {
    const response = await this.s3Client.send(
      new GetObjectCommand({ Bucket: this.getBucketName(type), Key: key }),
    );
    const mixed = sdkStreamMixin(response.Body as any);
    const uint8 = await mixed.transformToByteArray();
    return Buffer.from(uint8);
  }

  async uploadStream(type: BucketType, key: string, stream: Readable, contentType: string) {
    const parallelUploads3 = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.getBucketName(type),
        Key: key,
        Body: stream,
        ContentType: contentType,
      },
    });
    return parallelUploads3.done();
  }

  async getUploadPresignedUrl(key: string, type: BucketType, expiresIn: number = 3600) {
    const command = new PutObjectCommand({ Bucket: this.getBucketName(type), Key: key });
    const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
    return this.mapSignedUrlToPublicEndpoint(signedUrl);
  }

  async getReadPresignedUrl(key: string, type: BucketType, expiresIn: number = 3600) {
    const command = new GetObjectCommand({ Bucket: this.getBucketName(type), Key: key });
    const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
    return this.mapSignedUrlToPublicEndpoint(signedUrl);
  }

  async deleteObject(key: string, type: BucketType) {
    const bucketName = this.getBucketName(type);
    try {
      await this.s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
      this.logger.log(`Deleted object "${key}" from bucket "${bucketName}".`);
    } catch (error) {
      this.logger.error(`Failed to delete object "${key}" from bucket "${bucketName}":`, error);
      throw error;
    }
  }

  async deleteFolder(prefix: string, type: BucketType) {
    const bucketName = this.getBucketName(type);
    const internalPrefix = prefix.endsWith("/") ? prefix : prefix + "/";
    try {
      let continuationToken: string | undefined;
      do {
        const listResponse = await this.s3Client.send(
          new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: internalPrefix,
            ContinuationToken: continuationToken,
          }),
        );

        if (listResponse.Contents && listResponse.Contents.length > 0) {
          const deleteParams = {
            Bucket: bucketName,
            Delete: {
              Objects: listResponse.Contents.map((obj) => ({ Key: obj.Key })),
            },
          };
          await this.s3Client.send(new DeleteObjectsCommand(deleteParams));
          this.logger.log(
            `Deleted batch of ${listResponse.Contents.length} objects with prefix "${internalPrefix}".`,
          );
        }
        continuationToken = listResponse.NextContinuationToken;
      } while (continuationToken);
      this.logger.log(
        `Finished deleting folder with prefix "${internalPrefix}" from bucket "${bucketName}".`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete folder "${internalPrefix}" from bucket "${bucketName}":`,
        error,
      );
      throw error;
    }
  }
}
