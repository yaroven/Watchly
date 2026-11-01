# ADR-0018 — The client confirms an upload; nothing listens to the bucket

**Status:** accepted. Supersedes ADR-0005.

## Context

ADR-0005 noticed a finished upload through the bucket: S3 emitted an event into SQS,
`s3-event` long-polled the queue and enqueued the BullMQ job. Images depended on it
entirely — the api only presigned a PUT, so the event was the one way it learnt that
an avatar or a poster had arrived. Video already had a second path: the client finishes
a multipart upload through the api, and `completeUpload` queued the transcode itself.

Watchly is hosted on DigitalOcean. Spaces is S3-compatible for objects, presigning and
multipart uploads, but it has no bucket notifications and there is no SQS beside it,
so the event path has nothing to run on.

## Decision

**The client confirms every upload, and the api queues the job from the confirmation.**
Each image kind gets `POST …/upload-url/complete` with the `rawKey` the upload URL was
issued for. `ImageService.assertUploaded` refuses a key that is not this owner's and
this kind's, or that nothing has been uploaded to, and `ImagesService` then calls
`ImageTranscodeScheduler.schedule`. Video keeps `completeUpload` and the manual
`POST …/transcode`, which is also what still finds an object uploaded under a bare uuid
before the key scheme.

`s3-event`, its SQS client, `sqs-consumer`, the queue and the bucket notification are
gone from the code, the environment and the LocalStack provisioning.

## Consequences

- **An upload the client never confirms is never processed.** Closing the tab between
  the PUT and the confirmation leaves a raw object nobody queues. The event path did
  not have that gap. Nothing sweeps the raw bucket yet; if it matters, a periodic job
  can list raw objects older than a few minutes and queue them — the job ids already
  make that idempotent for images (`image-<rawKey>`).
- **A confirmation proves the object exists, not what it is.** The worker still runs
  ffprobe, because a Content-Type header proves nothing about the bytes.
- **Confirming twice queues one job.** The image job id is the raw key and the video job
  id is `transcode-<type>-<id>`, so a retried request is harmless.
- `ImageModule` still holds no queue: the scheduler is injected by the images endpoint
  service, so `UserModule` and `AuthModule` keep not pulling in Redis.
- The ingest metrics went with the consumer: `s3_event_lag_seconds`,
  `sqs_messages_total` and `sqs_dlq_messages` no longer exist, and neither do alerts
  on them. Queue depth (`bullmq_queue_jobs`) is what remains to watch.
- LocalStack now serves S3 only. The reason it is still preferred over MinIO in the
  home cluster is `PutBucketCors`, not notifications.
