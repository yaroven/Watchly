import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const s3ImageProtocol = process.env.NEXT_PUBLIC_S3_IMAGE_PROTOCOL === "https" ? "https" : "http";
const s3ImagePort = process.env.NEXT_PUBLIC_S3_IMAGE_PORT || "4566";
const s3ImageBucket = process.env.NEXT_PUBLIC_S3_IMAGE_BUCKET || "content";
const s3ImageHostname = process.env.NEXT_PUBLIC_S3_IMAGE_HOSTNAME || "localhost";
const s3PublicBaseUrl = process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL ? new URL(process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL) : null;
const s3InternalOrigin = process.env.NEXT_PUBLIC_S3_IMAGE_INTERNAL_ORIGIN
  ? new URL(process.env.NEXT_PUBLIC_S3_IMAGE_INTERNAL_ORIGIN)
  : null;

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    rootParams: true,
  },
  turbopack: {
    rules: {
      "*.svg": {
        loaders: [{ loader: "@svgr/webpack", options: { svgo: false, titleProp: true } }],
        as: "*.js",
      },
    },
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: [{ loader: "@svgr/webpack", options: { svgo: false, titleProp: true } }],
    });
    return config;
  },
  sassOptions: {
    implementation: "sass-embedded",
  },
  images: {
    dangerouslyAllowLocalIP: Boolean(s3InternalOrigin) && process.env.NODE_ENV !== "production",
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
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: s3ImageProtocol,
        hostname: s3ImageHostname,
        port: s3ImagePort,
        pathname: `/${s3ImageBucket}/**`,
      },
      ...(s3PublicBaseUrl
        ? [
            {
              protocol: s3PublicBaseUrl.protocol.replace(":", "") as "http" | "https",
              hostname: s3PublicBaseUrl.hostname,
              pathname: "/**",
            },
          ]
        : []),
      ...(s3InternalOrigin
        ? [
            {
              protocol: s3InternalOrigin.protocol.replace(":", "") as "http" | "https",
              hostname: s3InternalOrigin.hostname,
              port: s3InternalOrigin.port,
              pathname: `/${s3ImageBucket}/**`,
            },
          ]
        : []),
    ],
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
