#!/bin/bash
# Creates the buckets, the queue and the notification that wires them.
#
# LocalStack runs everything in /etc/localstack/init/ready.d once the edge
# port is up. The api used to do this itself at boot, which meant a runtime
# service holding CreateBucket / CreateQueue / PutBucketNotification rights
# in every environment including AWS, where the same resources are owned by
# the account. Now it only reads and writes objects, and this script stands
# in for what the cloud account provides.
#
# Mounted by docker compose for local development and by a ConfigMap in the
# home cluster, so both get the same topology from one file. Idempotent:
# LocalStack re-runs it on every start, persisted volume or not.
set -euo pipefail

RAW_BUCKET="${S3_RAW_BUCKET_NAME:-raw}"
PROCESSED_BUCKET="${S3_PROCESSED_BUCKET_NAME:-content}"
QUEUE="${SQS_QUEUE_NAME:-s3-event-queue}"
DLQ="${QUEUE}-dlq"

echo "provisioning: buckets ${RAW_BUCKET}/${PROCESSED_BUCKET}, queue ${QUEUE}"

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

# Failed events land here after five attempts rather than cycling forever.
DLQ_URL=$(awslocal sqs create-queue --queue-name "$DLQ" --output text --query QueueUrl)
DLQ_ARN=$(awslocal sqs get-queue-attributes --queue-url "$DLQ_URL" \
  --attribute-names QueueArn --output text --query 'Attributes.QueueArn')

QUEUE_URL=$(awslocal sqs create-queue --queue-name "$QUEUE" \
  --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"${DLQ_ARN}\\\",\\\"maxReceiveCount\\\":\\\"5\\\"}\"}" \
  --output text --query QueueUrl)
QUEUE_ARN=$(awslocal sqs get-queue-attributes --queue-url "$QUEUE_URL" \
  --attribute-names QueueArn --output text --query 'Attributes.QueueArn')

# S3 has to be allowed to post into the queue before the notification is
# accepted.
awslocal sqs set-queue-attributes --queue-url "$QUEUE_URL" --attributes "{
  \"Policy\": \"{\\\"Version\\\":\\\"2012-10-17\\\",\\\"Statement\\\":[{\\\"Effect\\\":\\\"Allow\\\",\\\"Principal\\\":{\\\"Service\\\":\\\"s3.amazonaws.com\\\"},\\\"Action\\\":\\\"sqs:SendMessage\\\",\\\"Resource\\\":\\\"${QUEUE_ARN}\\\"}]}\"
}" >/dev/null

# Only the raw bucket: uploads land there, and transcoder output in the
# processed bucket must not trigger another transcode.
awslocal s3api put-bucket-notification-configuration --bucket "$RAW_BUCKET" \
  --notification-configuration "{
    \"QueueConfigurations\": [{
      \"QueueArn\": \"${QUEUE_ARN}\",
      \"Events\": [\"s3:ObjectCreated:*\"]
    }]
  }"

echo "provisioning: done"
