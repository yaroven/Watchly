FROM node:alpine AS deps

WORKDIR /frontend

ARG NEXT_PUBLIC_BACKEND_API_URL
ARG BACKEND_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_REMOTE_IMAGE_HOSTNAME

ENV HUSKY=0
ENV BACKEND_API_URL=$BACKEND_API_URL
ENV NEXT_PUBLIC_BACKEND_API_URL=$NEXT_PUBLIC_BACKEND_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_REMOTE_IMAGE_HOSTNAME=$NEXT_PUBLIC_REMOTE_IMAGE_HOSTNAME

COPY package*.json yarn.lock ./

RUN yarn install --frozen-lockfile --ignore-scripts

FROM deps AS dev

EXPOSE 4000

CMD ["yarn", "dev"]

FROM deps AS builder

WORKDIR /frontend

COPY app ./app
COPY public ./public
COPY next.config.ts ./
COPY tsconfig.json ./
COPY eslint.config.mjs ./
COPY next-env.d.ts ./

RUN yarn build


FROM node:alpine AS runner

WORKDIR /frontend

ARG NEXT_PUBLIC_BACKEND_API_URL
ARG BACKEND_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_REMOTE_IMAGE_HOSTNAME

ENV HUSKY=0
ENV BACKEND_API_URL=$BACKEND_API_URL
ENV NEXT_PUBLIC_BACKEND_API_URL=$NEXT_PUBLIC_BACKEND_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_REMOTE_IMAGE_HOSTNAME=$NEXT_PUBLIC_REMOTE_IMAGE_HOSTNAME

COPY --from=builder /frontend/package.json ./package.json
COPY --from=builder /frontend/node_modules ./node_modules
COPY --from=builder /frontend/.next ./.next
COPY --from=builder /frontend/public ./public

EXPOSE 4000

CMD ["yarn", "start"]
