import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  NotFound,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import pMap from "p-map";
import { Readable } from "stream";
import { S3Config, S3ConfigName } from "../config/s3.config";
import BucketType from "./enums/bucket-type.enum";
import { MULTIPART_PART_SIZE, MultipartUploadPart } from "./multipart.constants";

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
    await Promise.all([
      this.verifyBucket(this.rawBucketName),
      this.verifyBucket(this.processedBucketName),
    ]);
  }

  /**
   * Buckets belong to the environment, not to this service: the LocalStack
   * init script creates them locally, the cloud account owns them elsewhere.
   * Checking at boot turns a missing one into a clear failure here instead of
   * a confusing 404 on the first upload — and keeps this service's
   * credentials down to reading and writing objects.
   */
  private async verifyBucket(bucketName: string, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
        this.logger.log(`Bucket "${bucketName}" verified.`);
        return;
      } catch (error) {
        if (error instanceof NotFound) {
          throw new InternalServerErrorException(
            `Bucket "${bucketName}" does not exist. It is provisioned with the environment, not by this service.`,
          );
        }
        // Storage may simply not be up yet on a cold start.
        if (attempt === retries) throw error;
        this.logger.warn(`Could not reach bucket "${bucketName}". Retrying in 2 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  private getBucketName(type: BucketType): string {
    return type === BucketType.RAW ? this.rawBucketName : this.processedBucketName;
  }

  async get(key: string, type: BucketType): Promise<Readable> {
    const response = await this.s3Client.send(
      new GetObjectCommand({ Bucket: this.getBucketName(type), Key: key }),
    );
    return response.Body as Readable;
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

  /**
   * Starts a multipart upload and presigns every part up front, so the browser can PUT parts
   * directly to S3 (and retry a single failed part) without another round trip to this API.
   */
  async startMultipartUpload(
    key: string,
    type: BucketType,
    fileSize: number,
    expiresIn: number = 3600,
  ): Promise<{ uploadId: string; partSize: number; parts: { partNumber: number; url: string }[] }> {
    const { UploadId } = await this.s3Client.send(
      new CreateMultipartUploadCommand({ Bucket: this.getBucketName(type), Key: key }),
    );
    if (!UploadId) {
      throw new InternalServerErrorException("Failed to start multipart upload");
    }

    const partCount = Math.max(1, Math.ceil(fileSize / MULTIPART_PART_SIZE));
    const partNumbers = Array.from({ length: partCount }, (_, index) => index + 1);

    const parts = await pMap(
      partNumbers,
      async (partNumber) => ({
        partNumber,
        url: await this.getUploadPartPresignedUrl(key, type, UploadId, partNumber, expiresIn),
      }),
      { concurrency: 8 },
    );

    return { uploadId: UploadId, partSize: MULTIPART_PART_SIZE, parts };
  }

  private async getUploadPartPresignedUrl(
    key: string,
    type: BucketType,
    uploadId: string,
    partNumber: number,
    expiresIn: number,
  ): Promise<string> {
    const command = new UploadPartCommand({
      Bucket: this.getBucketName(type),
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });
    const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
    return this.mapSignedUrlToPublicEndpoint(signedUrl);
  }

  async completeMultipartUpload(
    key: string,
    type: BucketType,
    uploadId: string,
    parts: MultipartUploadPart[],
  ): Promise<void> {
    await this.s3Client.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.getBucketName(type),
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: [...parts]
            .sort((a, b) => a.partNumber - b.partNumber)
            .map((part) => ({ PartNumber: part.partNumber, ETag: part.eTag })),
        },
      }),
    );
  }

  async abortMultipartUpload(key: string, type: BucketType, uploadId: string): Promise<void> {
    await this.s3Client.send(
      new AbortMultipartUploadCommand({
        Bucket: this.getBucketName(type),
        Key: key,
        UploadId: uploadId,
      }),
    );
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
