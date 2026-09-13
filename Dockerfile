FROM node:26-alpine AS builder

WORKDIR /app
COPY . .

RUN npm install -g corepack && corepack enable && yarn install --frozen-lockfile
RUN yarn build

FROM node:26-alpine AS runner

WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./

RUN npm install -g corepack && corepack enable && yarn install --production --frozen-lockfile

# Compose runs as node; the image optimizer must be able to persist its cache.
RUN mkdir -p .next/cache && chown -R node:node .next/cache

EXPOSE 3000

CMD ["yarn", "start"]
