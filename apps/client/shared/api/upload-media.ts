type UploadProgressHandler = (progress: number) => void;
type UploadToUrl = (url: string, file: File, onProgress: UploadProgressHandler) => Promise<void>;

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

export type GetImageUploadUrl = (contentType: string) => Promise<{ uploadUrl: string }>;

type UploadImageFileParams = {
  files?: FileList | null;
  getUploadUrl: GetImageUploadUrl;
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

export const uploadImageFile = async ({
  files,
  getUploadUrl,
  uploadToUrl,
  onProgress = noopProgress,
}: UploadImageFileParams): Promise<boolean> => {
  const file = getFirstFile(files);
  if (!file) return false;

  const { uploadUrl } = await getUploadUrl(file.type);
  await uploadToUrl(uploadUrl, file, onProgress);

  return true;
};
