import defaultPoster from "@/public/cat.webp";

const s3ImageBucket = process.env.NEXT_PUBLIC_S3_IMAGE_BUCKET || "content";

export function getOptimizedImageSrc(src?: string) {
  if (!src) {
    return defaultPoster;
  }

  if (src === "/cat.webp") {
    return defaultPoster;
  }

  if (src.startsWith("/")) {
    return src;
  }

  try {
    const url = new URL(src);
    const isS3BucketAsset = url.pathname.startsWith(`/${s3ImageBucket}/`);

    if (isS3BucketAsset) {
      return `/api/image-proxy?url=${encodeURIComponent(src)}`;
    }

    return url.toString();
  } catch {
    return src;
  }
}
