FROM node:alpine AS deps

WORKDIR /app

COPY package*.json ./
COPY yarn.lock ./

RUN yarn install --frozen-lockfile || yarn install

FROM deps AS dev

WORKDIR /app

RUN apk add --no-cache ffmpeg

COPY prisma ./prisma
COPY prisma.config.ts ./

ENV PATH="/app/node_modules/.bin:${PATH}"

EXPOSE 3000

CMD ["sh", "-c", "yarn wait-on tcp:db:5432 && yarn prisma generate && yarn prisma migrate deploy && yarn dev"]

FROM deps AS builder

WORKDIR /app

COPY src ./src
COPY prisma ./prisma
COPY eslint.config.mjs ./
COPY tsconfig.json ./
COPY prisma.config.ts ./

ENV PATH="/app/node_modules/.bin:${PATH}"

RUN yarn prisma generate && yarn build




FROM node:alpine AS runner

WORKDIR /app

RUN apk add --no-cache ffmpeg

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000

CMD ["sh", "-c", "yarn wait-on tcp:db:5432 && yarn prisma generate && yarn prisma migrate deploy && yarn prod"]
