import { registerAs } from "@nestjs/config";

export const S3ConfigName = "s3";

export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  processedBucketName: string;
  rawBucketName: string;
  endpoint: string;
  queueName: string;
}

export default registerAs(S3ConfigName, () => ({
  accessKeyId: process.env.S3_ACCESS_KEY_ID || "localstack",
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "localstack",
  region: process.env.S3_REGION || "us-east-1",
  rawBucketName: process.env.S3_RAW_BUCKET_NAME || "raw",
  processedBucketName: process.env.S3_PROCESSED_BUCKET_NAME || "content",
  endpoint: process.env.S3_ENDPOINT || "http://localhost:4566",
  queueName: process.env.SQS_QUEUE_NAME || "s3-event-queue",
}));
