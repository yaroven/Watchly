import type { NextConfig } from "next";

const s3ImageProtocol = process.env.NEXT_PUBLIC_S3_IMAGE_PROTOCOL === "https" ? "https" : "http";
const s3ImagePort = process.env.NEXT_PUBLIC_S3_IMAGE_PORT || "4566";
const s3ImageBucket = process.env.NEXT_PUBLIC_S3_IMAGE_BUCKET || "content";
const s3ImageHostname = process.env.NEXT_PUBLIC_S3_IMAGE_HOSTNAME || "localhost";

const nextConfig: NextConfig = {
  sassOptions: {
    implementation: "sass-embedded",
  },
  images: {
    localPatterns: [
      {
        pathname: "/api/image-proxy",
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: process.env.NEXT_PUBLIC_REMOTE_IMAGE_HOSTNAME || "m.media-amazon.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: s3ImageProtocol,
        hostname: s3ImageHostname,
        port: s3ImagePort,
        pathname: `/${s3ImageBucket}/**`,
      },
    ],
  },
};

export default nextConfig;
