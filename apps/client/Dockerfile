FROM node:22-alpine AS base
RUN npm install -g pnpm@11.22.0
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client/package.json ./apps/client/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
WORKDIR /app

ARG NEXT_PUBLIC_BACKEND_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_REMOTE_IMAGE_HOSTNAME
ARG NEXT_PUBLIC_S3_IMAGE_PROTOCOL
ARG NEXT_PUBLIC_S3_IMAGE_HOSTNAME
ARG NEXT_PUBLIC_S3_IMAGE_PORT
ARG NEXT_PUBLIC_S3_IMAGE_BUCKET

ENV NEXT_PUBLIC_BACKEND_API_URL=$NEXT_PUBLIC_BACKEND_API_URL \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_REMOTE_IMAGE_HOSTNAME=$NEXT_PUBLIC_REMOTE_IMAGE_HOSTNAME \
    NEXT_PUBLIC_S3_IMAGE_PROTOCOL=$NEXT_PUBLIC_S3_IMAGE_PROTOCOL \
    NEXT_PUBLIC_S3_IMAGE_HOSTNAME=$NEXT_PUBLIC_S3_IMAGE_HOSTNAME \
    NEXT_PUBLIC_S3_IMAGE_PORT=$NEXT_PUBLIC_S3_IMAGE_PORT \
    NEXT_PUBLIC_S3_IMAGE_BUCKET=$NEXT_PUBLIC_S3_IMAGE_BUCKET

COPY . .
RUN pnpm --filter client build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/client/public ./apps/client/public
COPY --from=builder /app/apps/client/.next/standalone ./
COPY --from=builder /app/apps/client/.next/static ./apps/client/.next/static

EXPOSE 4000

ENV PORT=4000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/client/server.js"]