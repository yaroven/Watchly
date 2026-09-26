type UploadProgressHandler = (progress: number) => void;
type UploadToUrl = (url: string, file: File, onProgress: UploadProgressHandler) => Promise<void>;
type EntityWithId = { id: string };
type PosterPayload = { posterUrl: string };

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
};

type UploadPosterFileParams = {
  files?: FileList | null;
  getPosterUploadUrl: () => Promise<{ uploadUrl: string; posterUrl: string }>;
  uploadToUrl: UploadToUrl;
  onProgress?: UploadProgressHandler;
};

type UpdateEntityPosterParams<TEntity extends EntityWithId, TPayload> = {
  entity: TEntity;
  files?: FileList | null;
  getPosterUploadUrl: (id: string) => Promise<{ uploadUrl: string; posterUrl: string }>;
  uploadToUrl: UploadToUrl;
  /** Update endpoints take the full entity, not just the poster — build that payload from `entity` + the new URL. */
  buildPayload: (entity: TEntity, posterUrl: string) => TPayload;
  update: (id: string, payload: TPayload) => Promise<TEntity>;
  onProgress?: UploadProgressHandler;
};

type WithUploadedPosterUrlParams<TPayload extends object> = {
  payload: TPayload;
  files?: FileList | null;
  getPosterUploadUrl: () => Promise<{ uploadUrl: string; posterUrl: string }>;
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
}: UploadMultipartFileParams): Promise<boolean> => {
  const file = getFirstFile(files);
  if (!file) return false;

  const { uploadId, partSize, parts } = await startUpload(file.size);
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
    }
  } catch (error) {
    await abortUpload(uploadId).catch(() => undefined);
    throw error;
  }

  await completeUpload(uploadId, completedParts);
  onProgress(100);
  return true;
};

export const uploadPosterFile = async ({
  files,
  getPosterUploadUrl,
  uploadToUrl,
  onProgress = noopProgress,
}: UploadPosterFileParams): Promise<string | undefined> => {
  const file = getFirstFile(files);
  if (!file) return undefined;

  const { uploadUrl, posterUrl } = await getPosterUploadUrl();
  await uploadToUrl(uploadUrl, file, onProgress);

  return posterUrl;
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
  const posterUrl = await uploadPosterFile({
    files,
    getPosterUploadUrl: () => getPosterUploadUrl(entity.id),
    uploadToUrl,
    onProgress,
  });

  if (!posterUrl) return entity;

  return update(entity.id, buildPayload(entity, posterUrl));
};

export const withUploadedPosterUrl = async <TPayload extends object>({
  payload,
  files,
  getPosterUploadUrl,
  uploadToUrl,
  onProgress,
}: WithUploadedPosterUrlParams<TPayload>): Promise<TPayload & Partial<PosterPayload>> => {
  const posterUrl = await uploadPosterFile({
    files,
    getPosterUploadUrl,
    uploadToUrl,
    onProgress,
  });

  if (!posterUrl) return payload;

  return {
    ...payload,
    posterUrl,
  };
};
