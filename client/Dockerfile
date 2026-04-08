FROM node:alpine AS builder

WORKDIR /frontend

COPY package*.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY app ./app
COPY public ./public
COPY next.config.ts ./
COPY tsconfig.json ./
COPY eslint.config.mjs ./
COPY next-env.d.ts ./

RUN yarn build


FROM node:alpine AS runner

WORKDIR /frontend

COPY --from=builder /frontend/package.json ./package.json
COPY --from=builder /frontend/node_modules ./node_modules
COPY --from=builder /frontend/.next ./.next
COPY --from=builder /frontend/public ./public

EXPOSE 4000

CMD ["yarn", "start"]