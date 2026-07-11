type UploadProgressHandler = (progress: number) => void;
type UploadToUrl = (url: string, file: File, onProgress: UploadProgressHandler) => Promise<void>;
type EntityWithId = { id: string };
type PosterPayload = { posterUrl: string };

type UploadSignedFileParams = {
  files?: FileList | null;
  getUploadUrl: () => Promise<string>;
  uploadToUrl: UploadToUrl;
  onProgress?: UploadProgressHandler;
};

type UploadPosterFileParams = {
  files?: FileList | null;
  getPosterUploadUrl: () => Promise<{ uploadUrl: string; posterUrl: string }>;
  uploadToUrl: UploadToUrl;
  onProgress?: UploadProgressHandler;
};

type UpdateEntityPosterParams<TEntity extends EntityWithId> = {
  entity: TEntity;
  files?: FileList | null;
  getPosterUploadUrl: (id: string) => Promise<{ uploadUrl: string; posterUrl: string }>;
  uploadToUrl: UploadToUrl;
  update: (id: string, payload: PosterPayload) => Promise<TEntity>;
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

export const uploadSignedFile = async ({
  files,
  getUploadUrl,
  uploadToUrl,
  onProgress = noopProgress,
}: UploadSignedFileParams): Promise<boolean> => {
  const file = getFirstFile(files);
  if (!file) return false;

  const uploadUrl = await getUploadUrl();
  await uploadToUrl(uploadUrl, file, onProgress);

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

export const updateEntityPoster = async <TEntity extends EntityWithId>({
  entity,
  files,
  getPosterUploadUrl,
  uploadToUrl,
  update,
  onProgress,
}: UpdateEntityPosterParams<TEntity>): Promise<TEntity> => {
  const posterUrl = await uploadPosterFile({
    files,
    getPosterUploadUrl: () => getPosterUploadUrl(entity.id),
    uploadToUrl,
    onProgress,
  });

  if (!posterUrl) return entity;

  return update(entity.id, { posterUrl });
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
