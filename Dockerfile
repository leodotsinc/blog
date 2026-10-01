FROM node:26-alpine@sha256:dbaa92e5758cbbcf85d65d5403fdb530fe3442cbe8c6dbfb7ef23365450d5070 AS base
# The pinned npm bundles vulnerable libraries. Patch its transitive packages
# using exact registry tarballs and SHA-512, leaving npm's package graph intact.
RUN set -eu; \
    for spec in brace-expansion@5.0.12 ip-address@10.7.1 undici@6.28.1; do \
      archive="$(npm pack "$spec" --silent --pack-destination /tmp)"; \
      case "$spec" in \
        brace-expansion@5.0.12) checksum=628bd0debce168b308ac38cd0cc90d4b4d6d79af77aa11211b9c72f1febe47497e770dca8bee6c0a822823de368ae2d94c75a881692d830543854d3d88d12299;; \
        ip-address@10.7.1) checksum=e0e500a94f59d62def0a74b4e61cc68859c4303a50fbada9003fcc5503a9f377d8c8d0bc1a5782a9a4b44229100667160ab285894b3f07cced4518983805ee08;; \
        undici@6.28.1) checksum=cd6a5d4d50f9e07e3c088c9b2f4ad6437ba4a5bf5ddb7c0cede1f946d7dd99e3fbd1c587363b5fa3b3f8bd95fee42a0370ee772783eee6e5e9ee535f8dce8344;; \
      esac; \
      printf '%s  %s\n' "$checksum" "/tmp/$archive" | sha512sum -c -; \
      name="${spec%@*}"; dest="/usr/local/lib/node_modules/npm/node_modules/$name"; \
      rm -rf "$dest"; mkdir -p "$dest"; \
      tar -xzf "/tmp/$archive" -C "$dest" --strip-components=1; \
      rm "/tmp/$archive"; \
    done; \
    npm --version

FROM base AS builder

WORKDIR /app
COPY . .

RUN npm install -g corepack && corepack enable && yarn install --frozen-lockfile
RUN yarn build

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

RUN npm install -g corepack && corepack enable && yarn install --production --frozen-lockfile

# Compose runs as node; the image optimizer must be able to persist its cache.
RUN mkdir -p .next/cache && chown -R node:node .next/cache

USER node

EXPOSE 3000

# Start the installed Next binary without per-user Corepack downloads.
CMD ["node", "node_modules/next/dist/bin/next", "start"]
