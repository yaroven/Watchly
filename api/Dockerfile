FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat ffmpeg

COPY package.json yarn.lock ./
COPY api/package.json ./api/

RUN yarn install --frozen-lockfile && yarn cache clean

FROM base AS builder
WORKDIR /app
COPY . .

RUN yarn workspace api build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat ffmpeg

ENV NODE_ENV=production

COPY package.json yarn.lock ./
COPY api/package.json ./api/

RUN yarn install --frozen-lockfile --production && yarn cache clean

COPY --from=builder /app/api/dist ./api/dist
COPY --from=builder /app/api/prisma ./api/prisma
COPY --from=builder /app/api/prisma.config.ts ./api/prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000

CMD ["yarn", "workspace", "api", "prod"]