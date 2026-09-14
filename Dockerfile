FROM node:26-alpine AS builder

WORKDIR /app
COPY . .

RUN npm install -g corepack && corepack enable && yarn install --frozen-lockfile
RUN yarn build

FROM node:26-alpine AS runner

ARG APP_VERSION
ARG APP_REVISION
ARG APP_BUILD_ID
ENV APP_VERSION=$APP_VERSION
ENV APP_REVISION=$APP_REVISION
ENV APP_BUILD_ID=$APP_BUILD_ID
ENV NEXT_TELEMETRY_DISABLED=1
LABEL org.opencontainers.image.version=$APP_VERSION
LABEL org.opencontainers.image.revision=$APP_REVISION
LABEL org.opencontainers.image.source="https://github.com/leodotsinc/blog"

WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./

RUN npm install -g corepack && corepack enable && yarn install --production --frozen-lockfile

# Compose runs as node; the image optimizer must be able to persist its cache.
RUN mkdir -p .next/cache && chown -R node:node .next/cache

USER node

EXPOSE 3000

# Start the installed Next binary without per-user Corepack downloads.
CMD ["node", "node_modules/next/dist/bin/next", "start"]
