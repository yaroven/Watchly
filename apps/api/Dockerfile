FROM node:22-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@10.30.0

# ─────────────────────────────────────────────────────────────────────────────
# Dependencies. Manifests only, so this layer survives every change that does
# not touch a dependency.
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile


# ─────────────────────────────────────────────────────────────────────────────
# Compile, then collect the api and its production dependencies into /prod.
# Copying /app/node_modules instead would drag every workspace package —
# Next.js, React, sharp — into an image that never runs them.
# ─────────────────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY apps/api ./apps/api
RUN pnpm --filter api build

RUN pnpm deploy --filter api --prod --legacy /prod
RUN cd /prod && /app/apps/api/node_modules/.bin/prisma generate


# ─────────────────────────────────────────────────────────────────────────────
# /prod now forks into two flavours. Both start from `builder`, so the work
# above happens once and neither copies the tree.
# ─────────────────────────────────────────────────────────────────────────────
FROM builder AS runtime-tree
RUN rm -rf /prod/node_modules/.pnpm/prisma@* \
           /prod/node_modules/.pnpm/typescript@* \
           /prod/node_modules/.pnpm/@prisma+studio-core@* \
           /prod/node_modules/.pnpm/@electric-sql+pglite@* \
           /prod/node_modules/.pnpm/effect@* \
           /prod/node_modules/prisma \
           /prod/node_modules/typescript

FROM builder AS migrate-tree
RUN D=$(ls -d /app/node_modules/.pnpm/prisma@* | head -1) \
 && cp -a "$D" /prod/node_modules/.pnpm/ \
 && cd /prod/node_modules \
 && ln -s ".pnpm/$(basename "$D")/node_modules/prisma" prisma

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=runtime-tree --chown=node:node /prod/node_modules ./node_modules
COPY --from=runtime-tree --chown=node:node /prod/dist ./dist
COPY --from=runtime-tree --chown=node:node /prod/prisma ./prisma
COPY --from=runtime-tree --chown=node:node /prod/prisma.config.ts ./prisma.config.ts
USER node

EXPOSE 3000

CMD ["node", "dist/src/main"]


FROM runner AS worker-runner
USER root
RUN apk add --no-cache ffmpeg
USER node

CMD ["node", "dist/src/worker-main"]


# Applied as its own step before the app rolls out — see k8s/migration/job.yaml.
# prisma.config.ts resolves its schema relatively, so /app must be the working
# directory.
FROM node:22-alpine AS migrator
WORKDIR /app
ENV NODE_ENV=production
COPY --from=migrate-tree --chown=node:node /prod ./
USER node

CMD ["node_modules/.bin/prisma", "migrate", "deploy"]
