# The build context MUST be the monorepo root — this image needs the root
# package.json / pnpm-lock.yaml / pnpm-workspace.yaml. Run from the repo root:
#
#   docker build -f apps/api/Dockerfile --target runner        -t watchly-api .
#   docker build -f apps/api/Dockerfile --target worker-runner -t watchly-transcoder-worker .
#
# (or `pnpm docker:build:api` / `pnpm docker:build:worker`).
# `cd apps/api && docker build .` cannot work: the root manifests are outside
# that context.
FROM node:22-alpine AS base
RUN npm install -g pnpm
WORKDIR /app
RUN apk add --no-cache libc6-compat ffmpeg

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY . .

RUN pnpm --filter api build

FROM node:22-alpine AS runner
RUN npm install -g pnpm
WORKDIR /app
RUN apk add --no-cache libc6-compat ffmpeg

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts

EXPOSE 3000

CMD ["node", "apps/api/dist/src/main"]

FROM runner AS worker-runner

CMD ["node", "apps/api/dist/src/worker-main"]