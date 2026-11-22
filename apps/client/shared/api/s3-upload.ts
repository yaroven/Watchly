import axios from "axios";

export async function putFileToS3(url: string, file: File, onProgress: (percent: number) => void): Promise<void> {
  await axios.put(url, file, {
    headers: { "Content-Type": file.type },
    onUploadProgress: (event) => {
      const total = event.total || file.size;
      onProgress(Math.round((event.loaded * 100) / total));
    },
  });
}

export async function putPartToS3(url: string, chunk: Blob, onLoaded: (loaded: number) => void): Promise<string> {
  const response = await axios.put(url, chunk, { onUploadProgress: (event) => onLoaded(event.loaded) });
  const eTag = response.headers.etag as string | undefined;
  if (!eTag) throw new Error("S3 did not return an ETag for the uploaded part");
  return eTag;
}
