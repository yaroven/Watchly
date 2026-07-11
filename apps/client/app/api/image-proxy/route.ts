import { NextRequest } from "next/server";

const s3ImageBucket = process.env.NEXT_PUBLIC_S3_IMAGE_BUCKET || "content";
const s3ImageInternalOrigin = process.env.S3_IMAGE_INTERNAL_ORIGIN || "http://localstack:4566";
const s3ImagePublicOrigin = process.env.S3_IMAGE_PUBLIC_ORIGIN || "http://localhost:4566";

function normalizeProxyTarget(rawUrl: string) {
  const url = new URL(rawUrl);
  const isS3BucketAsset = url.pathname.startsWith(`/${s3ImageBucket}/`);

  if (!isS3BucketAsset) {
    throw new Error("Unsupported image path");
  }

  const publicOrigin = new URL(s3ImagePublicOrigin);
  if (url.origin === publicOrigin.origin) {
    const internalOrigin = new URL(s3ImageInternalOrigin);
    url.protocol = internalOrigin.protocol;
    url.hostname = internalOrigin.hostname;
    url.port = internalOrigin.port;
  }

  return url.toString();
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("url");

  if (!source) {
    return new Response("Missing url", { status: 400 });
  }

  let target: string;

  try {
    target = normalizeProxyTarget(source);
  } catch {
    return new Response("Unsupported image url", { status: 400 });
  }

  const upstream = await fetch(target, {
    cache: "no-store",
  });

  if (!upstream.ok) {
    return new Response("Failed to fetch image", { status: upstream.status });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "image/webp",
      "Cache-Control": "public, max-age=60",
    },
  });
}
