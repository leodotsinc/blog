FROM node:26-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94 AS base

# Apply Alpine's current zlib security fix before either application stage.
RUN apk add --no-cache 'zlib>=1.3.2-r1'

FROM base AS builder

WORKDIR /app
COPY . .

RUN npm install -g corepack@0.36.0 && corepack enable && yarn install --frozen-lockfile \
    && yarn cache clean \
    && npm cache clean --force
RUN yarn build \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

FROM base AS runner

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

RUN npm install -g corepack@0.36.0 && corepack enable && yarn install --production --frozen-lockfile \
    && yarn cache clean \
    && npm cache clean --force \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# Compose runs as node; the image optimizer must be able to persist its cache.
RUN mkdir -p .next/cache && chown -R node:node .next/cache

USER node

EXPOSE 3000

# Start the installed Next binary without per-user Corepack downloads.
CMD ["node", "node_modules/next/dist/bin/next", "start"]
