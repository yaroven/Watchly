#!/bin/bash
# Creates the buckets and the CORS rules the browser's uploads need.
#
# LocalStack runs everything in /etc/localstack/init/ready.d once the edge
# port is up. The api used to do this itself at boot, which meant a runtime
# service holding CreateBucket / PutBucketCors rights in every environment,
# where the same resources are owned by the account. Now it only reads and
# writes objects, and this script stands in for what the account provides.
#
# Mounted by docker compose for local development and by a ConfigMap in the
# home cluster, so both get the same topology from one file. Idempotent:
# LocalStack re-runs it on every start, persisted volume or not.
set -euo pipefail

RAW_BUCKET="${S3_RAW_BUCKET_NAME:-raw}"
PROCESSED_BUCKET="${S3_PROCESSED_BUCKET_NAME:-content}"

echo "provisioning: buckets ${RAW_BUCKET}/${PROCESSED_BUCKET}"

for bucket in "$RAW_BUCKET" "$PROCESSED_BUCKET"; do
  awslocal s3api create-bucket --bucket "$bucket" >/dev/null 2>&1 || true

  # The browser reads the ETag of each uploaded part to complete a multipart
  # upload; without ExposeHeaders it sees undefined and the upload dies at the
  # last step.
  awslocal s3api put-bucket-cors --bucket "$bucket" --cors-configuration '{
    "CORSRules": [{
      "AllowedMethods": ["PUT", "GET", "HEAD"],
      "AllowedOrigins": ["*"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }]
  }' >/dev/null
done

echo "provisioning: done"
