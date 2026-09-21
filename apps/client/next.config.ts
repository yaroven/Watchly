import type { NextConfig } from "next";

const s3ImageProtocol = process.env.NEXT_PUBLIC_S3_IMAGE_PROTOCOL === "https" ? "https" : "http";
const s3ImagePort = process.env.NEXT_PUBLIC_S3_IMAGE_PORT || "4566";
const s3ImageBucket = process.env.NEXT_PUBLIC_S3_IMAGE_BUCKET || "content";
const s3ImageHostname = process.env.NEXT_PUBLIC_S3_IMAGE_HOSTNAME || "localhost";
const s3InternalOrigin = process.env.NEXT_PUBLIC_S3_IMAGE_INTERNAL_ORIGIN
  ? new URL(process.env.NEXT_PUBLIC_S3_IMAGE_INTERNAL_ORIGIN)
  : null;

const nextConfig: NextConfig = {
  output: "standalone",
  // SVGR turns .svg imports into React components, so icons inherit
  // currentColor and can be recoloured through sx/CSS.
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
    // The optimizer refuses private IPs (SSRF guard). In Docker the S3 host
    // resolves to the compose network, so the guard has to be lifted there —
    // never in production, where upstreams are public.
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
      // TEMPORARY: placeholder images for the mocked news feed. Drop this once
      // the news endpoint returns real image URLs.
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
      // Host the optimizer fetches bucket assets from; see get-optimized-image-src.
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

export default nextConfig;
