import { uploadImageFile, uploadMultipartFile } from "./upload-media";

type Percent = number;

export interface MediaAsset {
  weight: number;
  upload: (onProgress: (percent: Percent) => void) => Promise<unknown>;
}

type Assets<E> = (entity: E) => (MediaAsset | null)[];

interface WriteProgress {
  onProgress?: (percent: Percent) => void;
}

export interface MediaBackedCreate<E> extends WriteProgress {
  create: () => Promise<E>;
  assets: Assets<E>;
  remove: (entity: E) => Promise<unknown>;
  reload?: (entity: E) => Promise<E>;
}

export interface MediaBackedUpdate<E> extends WriteProgress {
  update: () => Promise<E>;
  assets: Assets<E>;
  reload?: (entity: E) => Promise<E>;
}

export function combinedProgress(weights: number[], report: (percent: Percent) => void) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const done = weights.map(() => 0);
  let last = 0;

  return weights.map((weight, index) => (percent: Percent) => {
    done[index] = Math.min(100, Math.max(0, percent)) / 100;
    const overall = total > 0 ? weights.reduce((sum, w, i) => sum + w * done[i], 0) / total : 1;
    const rounded = Math.floor(overall * 100);
    if (rounded > last) {
      last = rounded;
      report(rounded);
    }
  });
}

async function uploadAll(assets: MediaAsset[], onProgress?: (percent: Percent) => void) {
  const reporters = combinedProgress(
    assets.map((asset) => asset.weight),
    onProgress ?? (() => undefined),
  );
  for (const [index, asset] of assets.entries()) {
    await asset.upload(reporters[index]);
    reporters[index](100);
  }
}

const present = (assets: (MediaAsset | null)[]) => assets.filter((asset): asset is MediaAsset => asset !== null);

async function reloadOrKeep<E>(entity: E, reload: ((entity: E) => Promise<E>) | undefined, uploaded: boolean): Promise<E> {
  if (!reload || !uploaded) return entity;
  try {
    return await reload(entity);
  } catch (error) {
    console.error("Reading the entity back after its uploads failed; keeping the saved entity", error);
    return entity;
  }
}

export async function createWithMedia<E>({ create, assets, remove, reload, onProgress }: MediaBackedCreate<E>): Promise<E> {
  onProgress?.(0);
  const entity = await create();
  const pending = present(assets(entity));
  try {
    await uploadAll(pending, onProgress);
  } catch (error) {
    await Promise.resolve(remove(entity)).catch((rollbackError) => console.error("Rollback after a failed upload failed", rollbackError));
    throw error;
  }
  return reloadOrKeep(entity, reload, pending.length > 0);
}

export async function updateWithMedia<E>({ update, assets, reload, onProgress }: MediaBackedUpdate<E>): Promise<E> {
  onProgress?.(0);
  const entity = await update();
  const pending = present(assets(entity));
  await uploadAll(pending, onProgress);
  return reloadOrKeep(entity, reload, pending.length > 0);
}

const firstFile = (files?: FileList | null) => files?.[0];

type ImagePorts = Omit<Parameters<typeof uploadImageFile>[0], "files" | "onProgress">;
type MultipartPorts = Omit<Parameters<typeof uploadMultipartFile>[0], "files" | "onProgress">;

export function imageAsset(files: FileList | null | undefined, ports: ImagePorts): MediaAsset | null {
  const file = firstFile(files);
  if (!file) return null;
  return { weight: file.size, upload: (onProgress) => uploadImageFile({ ...ports, files, onProgress }) };
}

export function multipartAsset(files: FileList | null | undefined, ports: MultipartPorts): MediaAsset | null {
  const file = firstFile(files);
  if (!file) return null;
  return { weight: file.size, upload: (onProgress) => uploadMultipartFile({ ...ports, files, onProgress }) };
}
