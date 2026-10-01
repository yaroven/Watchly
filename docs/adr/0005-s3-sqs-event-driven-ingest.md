# ADR-0005 — Ingest is event-driven: S3 → SQS → BullMQ

**Status:** accepted

## Context

The API must notice a finished upload without polling the bucket.

## Decision

S3 emits an event on object creation; `s3-event` consumes the SQS queue with
`sqs-consumer` and enqueues a BullMQ job. LocalStack provides both S3 and SQS in dev.

Provisioning the bucket, the queue and the notification wiring is **not** done at app
boot. It lives in the environment: `k8s/home/localstack-init/provision.sh` locally and in
the cloud account's own IaC otherwise.

## Consequences

- No polling loop and no cron.
- Boot-time provisioning was removed deliberately: with more than one API replica each
  replica raced to reconfigure the bucket, and it demanded IAM permissions the running
  app has no other reason to hold.
- MinIO does not implement `PutBucketCors`, which is part of why the home cluster runs
  LocalStack rather than MinIO for the S3 role.
