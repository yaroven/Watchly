FROM node:22-alpine AS base
WORKDIR /app

COPY package.json yarn.lock ./
COPY client/package.json ./client/package.json

RUN yarn install --frozen-lockfile && yarn cache clean

FROM base AS builder
WORKDIR /app

COPY . .
RUN yarn workspace client build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/client/public ./client/public
COPY --from=builder /app/client/.next/static ./client/.next/static

EXPOSE 4000

ENV PORT=4000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "client/server.js"]