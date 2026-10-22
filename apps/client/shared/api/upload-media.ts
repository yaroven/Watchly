type UploadProgressHandler = (progress: number) => void;
type UploadToUrl = (url: string, file: File, onProgress: UploadProgressHandler) => Promise<void>;
type EntityWithId = { id: string };
type PosterUploadedFlag = { posterUploaded: true };

export type UploadPartToUrl = (url: string, chunk: Blob, onLoaded: (loaded: number) => void) => Promise<string>;

export type CompletedPart = { partNumber: number; eTag: string };
export type MultipartUploadPart = { partNumber: number; url: string };
export type StartMultipartUpload = { uploadId: string; partSize: number; parts: MultipartUploadPart[] };

type UploadMultipartFileParams = {
  files?: FileList | null;
  startUpload: (fileSize: number) => Promise<StartMultipartUpload>;
  completeUpload: (uploadId: string, parts: CompletedPart[]) => Promise<void>;
  abortUpload: (uploadId: string) => Promise<void>;
  uploadPartToUrl: UploadPartToUrl;
  onProgress?: UploadProgressHandler;
  onPartProgress?: (completedParts: number, totalParts: number) => void;
};

type UploadPosterFileParams = {
  files?: FileList | null;
  getPosterUploadUrl: () => Promise<{ uploadUrl: string }>;
  uploadToUrl: UploadToUrl;
  onProgress?: UploadProgressHandler;
};

type UpdateEntityPosterParams<TEntity extends EntityWithId, TPayload> = {
  entity: TEntity;
  files?: FileList | null;
  getPosterUploadUrl: (id: string) => Promise<{ uploadUrl: string }>;
  uploadToUrl: UploadToUrl;
  /** Update endpoints take the full entity, not just the poster — build that payload from `entity` plus the flag. */
  buildPayload: (entity: TEntity, posterUploaded: true) => TPayload;
  update: (id: string, payload: TPayload) => Promise<TEntity>;
  onProgress?: UploadProgressHandler;
};

type WithPosterUploadedParams<TPayload extends object> = {
  payload: TPayload;
  files?: FileList | null;
  getPosterUploadUrl: () => Promise<{ uploadUrl: string }>;
  uploadToUrl: UploadToUrl;
  onProgress?: UploadProgressHandler;
};

const noopProgress: UploadProgressHandler = () => undefined;

const getFirstFile = (files?: FileList | null): File | undefined => files?.[0];

const PART_RETRY_ATTEMPTS = 3;
const PART_RETRY_DELAY_MS = 1000;

async function uploadPartWithRetry(
  uploadPartToUrl: UploadPartToUrl,
  url: string,
  chunk: Blob,
  onLoaded: (loaded: number) => void,
): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= PART_RETRY_ATTEMPTS; attempt++) {
    try {
      return await uploadPartToUrl(url, chunk, onLoaded);
    } catch (error) {
      lastError = error;
      onLoaded(0);
      if (attempt < PART_RETRY_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, PART_RETRY_DELAY_MS * attempt));
      }
    }
  }
  throw lastError;
}

/**
 * Uploads a file in S3-multipart chunks — a flaky connection only has to retry the one part
 * that failed, not restart a multi-GB transfer from zero. Parts upload sequentially (simpler
 * progress/error accounting than concurrent parts); on an unrecoverable part failure the whole
 * upload is aborted server-side so S3 doesn't keep billing for the orphaned parts.
 */
export const uploadMultipartFile = async ({
  files,
  startUpload,
  completeUpload,
  abortUpload,
  uploadPartToUrl,
  onProgress = noopProgress,
  onPartProgress,
}: UploadMultipartFileParams): Promise<boolean> => {
  const file = getFirstFile(files);
  if (!file) return false;

  const { uploadId, partSize, parts } = await startUpload(file.size);
  onPartProgress?.(0, parts.length);
  const loadedByPart = new Array(parts.length).fill(0);
  const reportProgress = () => {
    const loaded = loadedByPart.reduce((sum: number, n: number) => sum + n, 0);
    onProgress(Math.min(99, Math.round((loaded / file.size) * 100)));
  };

  const completedParts: CompletedPart[] = [];

  try {
    for (const [index, { partNumber, url }] of parts.entries()) {
      const start = (partNumber - 1) * partSize;
      const chunk = file.slice(start, start + partSize);
      const eTag = await uploadPartWithRetry(uploadPartToUrl, url, chunk, (loaded) => {
        loadedByPart[index] = loaded;
        reportProgress();
      });
      completedParts.push({ partNumber, eTag });
      onPartProgress?.(completedParts.length, parts.length);
    }
  } catch (error) {
    await abortUpload(uploadId).catch(() => undefined);
    throw error;
  }

  await completeUpload(uploadId, completedParts);
  onProgress(100);
  return true;
};

/**
 * Uploads the image and reports whether there was one, nothing more.
 *
 * It used to return the read URL the endpoint handed back, which the caller then
 * sent to the update endpoint to be stored in the row — a presigned URL with an
 * hour on it, persisted. The key is derived from the entity server-side now, so
 * the only thing worth telling the server is that the object is there.
 */
export const uploadPosterFile = async ({
  files,
  getPosterUploadUrl,
  uploadToUrl,
  onProgress = noopProgress,
}: UploadPosterFileParams): Promise<boolean> => {
  const file = getFirstFile(files);
  if (!file) return false;

  const { uploadUrl } = await getPosterUploadUrl();
  await uploadToUrl(uploadUrl, file, onProgress);

  return true;
};

export const updateEntityPoster = async <TEntity extends EntityWithId, TPayload>({
  entity,
  files,
  getPosterUploadUrl,
  uploadToUrl,
  buildPayload,
  update,
  onProgress,
}: UpdateEntityPosterParams<TEntity, TPayload>): Promise<TEntity> => {
  const uploaded = await uploadPosterFile({
    files,
    getPosterUploadUrl: () => getPosterUploadUrl(entity.id),
    uploadToUrl,
    onProgress,
  });

  if (!uploaded) return entity;

  return update(entity.id, buildPayload(entity, true));
};

export const withPosterUploaded = async <TPayload extends object>({
  payload,
  files,
  getPosterUploadUrl,
  uploadToUrl,
  onProgress,
}: WithPosterUploadedParams<TPayload>): Promise<TPayload & Partial<PosterUploadedFlag>> => {
  const uploaded = await uploadPosterFile({
    files,
    getPosterUploadUrl,
    uploadToUrl,
    onProgress,
  });

  // Left off entirely when there is no new image: `false` would clear a poster
  // the user never touched.
  if (!uploaded) return payload;

  return {
    ...payload,
    posterUploaded: true,
  };
};
