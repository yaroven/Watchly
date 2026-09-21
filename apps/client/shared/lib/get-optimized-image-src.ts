import defaultPoster from "@/public/cat.webp";

const s3ImageBucket = process.env.NEXT_PUBLIC_S3_IMAGE_BUCKET || "content";

/**
 * Origin the image optimizer should fetch bucket assets from.
 *
 * Poster URLs are stored with the browser-facing host, which the server cannot
 * reach from inside its container — there `localhost` is the app itself. When
 * this is set, the host is swapped before handing the URL to next/image; when
 * it is not (production, where both sides use the same host), URLs pass through
 * untouched.
 */
const s3InternalOrigin = process.env.NEXT_PUBLIC_S3_IMAGE_INTERNAL_ORIGIN;

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

    if (isS3BucketAsset && s3InternalOrigin) {
      const internal = new URL(s3InternalOrigin);
      url.protocol = internal.protocol;
      url.hostname = internal.hostname;
      url.port = internal.port;
    }

    return url.toString();
  } catch {
    return src;
  }
}
