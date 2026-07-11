FROM node:22-alpine AS base
RUN npm install -g pnpm
WORKDIR /app
RUN apk add --no-cache libc6-compat ffmpeg

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY api/package.json ./api/

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

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY api/package.json ./api/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/api/dist ./api/dist
COPY --from=builder /app/api/prisma ./api/prisma
COPY --from=builder /app/api/prisma.config.ts ./api/prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000

CMD ["pnpm", "--filter", "api", "prod"]