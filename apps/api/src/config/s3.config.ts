import { registerAs } from "@nestjs/config";
import { DEV_DEFAULTS } from "../common/dev-defaults.const";
import { requireInProduction } from "../common/env.util";

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

/**
 * Policy: every value here goes through requireInProduction — hard-fail if
 * unset in production, fall back to a LocalStack-friendly default otherwise.
 * Nothing is silently defaulted in prod, and nothing needs a `.env` just to
 * run `docker compose up` locally.
 */
export default registerAs(S3ConfigName, () => ({
  accessKeyId: requireInProduction(
    process.env.S3_ACCESS_KEY_ID,
    "S3_ACCESS_KEY_ID",
    DEV_DEFAULTS.S3_ACCESS_KEY_ID,
  ),
  secretAccessKey: requireInProduction(
    process.env.S3_SECRET_ACCESS_KEY,
    "S3_SECRET_ACCESS_KEY",
    DEV_DEFAULTS.S3_SECRET_ACCESS_KEY,
  ),
  region: requireInProduction(process.env.S3_REGION, "S3_REGION", "us-east-1"),
  rawBucketName: requireInProduction(process.env.S3_RAW_BUCKET_NAME, "S3_RAW_BUCKET_NAME", "raw"),
  processedBucketName: requireInProduction(
    process.env.S3_PROCESSED_BUCKET_NAME,
    "S3_PROCESSED_BUCKET_NAME",
    "content",
  ),
  internalEndpoint: requireInProduction(
    process.env.S3_ENDPOINT_INTERNAL,
    "S3_ENDPOINT_INTERNAL",
    "http://localhost:4566",
  ),
  publicEndpoint: requireInProduction(
    process.env.S3_ENDPOINT_PUBLIC,
    "S3_ENDPOINT_PUBLIC",
    "http://localhost:4566",
  ),
  queueName: requireInProduction(process.env.SQS_QUEUE_NAME, "SQS_QUEUE_NAME", "s3-event-queue"),
}));
