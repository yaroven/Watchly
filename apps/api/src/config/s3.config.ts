import { registerAs } from "@nestjs/config";

export const S3ConfigName = "s3";

export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  processedBucketName: string;
  rawBucketName: string;
  internalEndpoint: string;
  publicEndpoint: string;
  queueName: string;
}

function requireInProduction(
  value: string | undefined,
  envVar: string,
  devDefault: string,
): string {
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
  return devDefault;
}

export default registerAs(S3ConfigName, () => ({
  accessKeyId: requireInProduction(process.env.S3_ACCESS_KEY_ID, "S3_ACCESS_KEY_ID", "localstack"),
  secretAccessKey: requireInProduction(
    process.env.S3_SECRET_ACCESS_KEY,
    "S3_SECRET_ACCESS_KEY",
    "localstack",
  ),
  region: process.env.S3_REGION || "us-east-1",
  rawBucketName: process.env.S3_RAW_BUCKET_NAME || "raw",
  processedBucketName: process.env.S3_PROCESSED_BUCKET_NAME || "content",
  internalEndpoint: process.env.S3_ENDPOINT_INTERNAL || "http://localhost:4566",
  publicEndpoint: process.env.S3_ENDPOINT_PUBLIC || "http://localhost:4566",
  queueName: process.env.SQS_QUEUE_NAME || "s3-event-queue",
}));
