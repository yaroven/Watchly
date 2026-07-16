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