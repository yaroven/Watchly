import { registerAs } from "@nestjs/config";
import { DEV_DEFAULTS } from "../common/dev-defaults.const";
import { requireInProduction } from "../common/utils/env.util";

export const S3ConfigName = "s3";

export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  processedBucketName: string;
  rawBucketName: string;
  internalEndpoint: string;
  publicEndpoint: string;
}

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
}));
