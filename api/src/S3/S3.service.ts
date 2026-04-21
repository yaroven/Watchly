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
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { sdkStreamMixin } from "@aws-sdk/util-stream-node";
import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Config, S3ConfigName } from "../config/s3.config";
import { Readable } from "stream";

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
      endpoint: this.s3Config.endpoint,
    });
  }

  async onModuleInit() {
    await Promise.all([
      this.initializeBucket(this.rawBucketName),
      this.initializeBucket(this.processedBucketName),
    ]);
  }

  private async initializeBucket(bucketName: string) {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
      this.logger.log(`Bucket "${bucketName}" verified.`);
    } catch (error: any) {
      if (error instanceof NotFound) {
        this.logger.log(`Bucket "${bucketName}" not found. Creating it now...`);
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
      } else if (error instanceof S3ServiceException) {
        this.logger.error(`S3 Service Error [${error.name}]: ${error.message}`);
        throw new InternalServerErrorException(`S3 Connection Error: ${error.name}`);
      } else {
        this.logger.error(`Unexpected Error: ${error}`);
        throw new InternalServerErrorException(
          "An unexpected error occurred during S3 initialization",
        );
      }
    }
  }
  async getRaw(key: string) {
    return this.get(key, this.rawBucketName);
  }

  async getRawBuffer(key: string) {
    return this.getFileBuffer(key, this.rawBucketName);
  }

  async uploadRawStream(key: string, stream: Readable, contentType: string) {
    return this.uploadStream(this.rawBucketName, key, stream, contentType);
  }

  async getRawUploadUrl(key: string, expiresIn?: number) {
    return this.getUploadPresignedUrl(key, this.rawBucketName, expiresIn);
  }

  // --- PROCESSED BUCKET METHODS ---

  async getProcessed(key: string) {
    return this.get(key, this.processedBucketName);
  }

  async getProcessedBuffer(key: string) {
    return this.getFileBuffer(key, this.processedBucketName);
  }

  async uploadProcessedStream(key: string, stream: Readable, contentType: string) {
    return this.uploadStream(this.processedBucketName, key, stream, contentType);
  }

  async getProcessedReadUrl(key: string, expiresIn?: number) {
    return this.getReadPresignedUrl(key, this.processedBucketName, expiresIn);
  }

  async deleteRaw(key: string) {
    return this.deleteObject(this.rawBucketName, key);
  }

  async deleteProcessed(key: string) {
    return this.deleteObject(this.processedBucketName, key);
  }

  async deleteProcessedFolder(prefix: string) {
    return this.deleteFolder(this.processedBucketName, prefix);
  }

  // --- GENERIC INTERNAL HELPERS ---
  // These can stay public if you need them, but making them private
  // ensures everyone follows the Raw/Processed convention.

  private async get(key: string, bucketName: string): Promise<Readable> {
    const response = await this.s3Client.send(
      new GetObjectCommand({ Bucket: bucketName, Key: key }),
    );
    return response.Body as Readable;
  }

  private async getFileBuffer(key: string, bucketName: string) {
    const response = await this.s3Client.send(
      new GetObjectCommand({ Bucket: bucketName, Key: key }),
    );
    const mixed = sdkStreamMixin(response.Body as any);
    const uint8 = await mixed.transformToByteArray();
    return Buffer.from(uint8);
  }

  private async uploadStream(bucket: string, key: string, stream: Readable, contentType: string) {
    const parallelUploads3 = new Upload({
      client: this.s3Client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: stream,
        ContentType: contentType,
      },
    });
    return parallelUploads3.done();
  }

  private async getUploadPresignedUrl(key: string, bucketName: string, expiresIn: number = 3600) {
    const command = new PutObjectCommand({ Bucket: bucketName, Key: key });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  private async getReadPresignedUrl(key: string, bucketName: string, expiresIn: number = 3600) {
    const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  private async deleteObject(bucketName: string, key: string) {
    try {
      await this.s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
      this.logger.log(`Deleted object "${key}" from bucket "${bucketName}".`);
    } catch (error) {
      this.logger.error(`Failed to delete object "${key}" from bucket "${bucketName}":`, error);
    }
  }

  private async deleteFolder(bucketName: string, prefix: string) {
    let internalPrefix = prefix;
    if (!internalPrefix.endsWith("/")) internalPrefix += "/";
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
    }
  }
}
