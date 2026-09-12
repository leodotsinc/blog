#!/usr/bin/env bash
#
# Validates Spotify credentials, then writes them to the production env file
# and recreates the container.
#
#   SPOTIFY_CLIENT_ID=... \
#   SPOTIFY_CLIENT_SECRET=... \
#   SPOTIFY_REFRESH_TOKEN=... \
#   VPS_HOST=leo@203.0.113.10 VPS_PORT=22 \
#     ./scripts/sync-spotify-env.sh
#
# Get the refresh token from scripts/spotify-refresh-token.mjs first.
# Values travel over stdin, never in argv, so they stay out of the remote
# process list. Nothing is echoed.

set -euo pipefail

APP_DIR="${APP_DIR:-/home/leo/apps/leodots.dev}"
SERVICE="${SERVICE:-blog}"
CONTAINER="${CONTAINER:-leodots-blog}"
SITE_URL="${SITE_URL:-https://leodots.com}"
VPS_PORT="${VPS_PORT:-22}"

for var in SPOTIFY_CLIENT_ID SPOTIFY_CLIENT_SECRET SPOTIFY_REFRESH_TOKEN VPS_HOST; do
  if [ -z "${!var:-}" ]; then
    echo "Missing $var" >&2
    exit 1
  fi
done

# ---------------------------------------------------------------- validate --
# Fail here rather than after shipping a broken value to production.
echo "→ checking the credentials against Spotify…"

basic=$(printf '%s:%s' "$SPOTIFY_CLIENT_ID" "$SPOTIFY_CLIENT_SECRET" | base64 | tr -d '\n')

response=$(curl -s -w '\n%{http_code}' -X POST https://accounts.spotify.com/api/token \
  -H "Authorization: Basic ${basic}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "grant_type=refresh_token" \
  --data-urlencode "refresh_token=${SPOTIFY_REFRESH_TOKEN}")

status=$(printf '%s' "$response" | tail -n1)
body=$(printf '%s' "$response" | sed '$d')

if [ "$status" != "200" ]; then
  echo "✗ Spotify refused these credentials (HTTP $status)." >&2
  echo "  $(printf '%s' "$body" | tr -d '\n' | cut -c1-240)" >&2
  echo >&2
  case "$body" in
    *invalid_client*)
      echo "  invalid_client → the client id or secret is wrong." >&2 ;;
    *invalid_grant*)
      echo "  invalid_grant → the refresh token does not belong to this secret." >&2
      echo "  Mint a new one: node scripts/spotify-refresh-token.mjs" >&2 ;;
  esac
  exit 1
fi

# confirm the token actually carries the scopes the widget needs
access_token=$(printf '%s' "$body" | sed -n 's/.*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
probe=$(curl -s -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer ${access_token}" \
  "https://api.spotify.com/v1/me/player/recently-played?limit=1")

if [ "$probe" = "403" ] || [ "$probe" = "401" ]; then
  echo "✗ Token works but the API refused it (HTTP $probe) — scope missing." >&2
  echo "  Re-run scripts/spotify-refresh-token.mjs and approve the consent screen." >&2
  exit 1
fi

echo "✓ credentials valid (scopes ok)"

# -------------------------------------------------------------------- push --
echo "→ updating ${APP_DIR}/.env on ${VPS_HOST}…"

ssh -p "$VPS_PORT" "$VPS_HOST" 'bash -s' <<REMOTE
set -euo pipefail
cd "${APP_DIR}"

if [ ! -f .env ]; then
  echo "No .env in ${APP_DIR} — check how docker-compose.yml passes variables." >&2
  exit 1
fi

cp .env ".env.bak.\$(date +%Y%m%d%H%M%S)"

upsert() {
  key="\$1"; value="\$2"
  if grep -q "^\${key}=" .env; then
    grep -v "^\${key}=" .env > .env.tmp
    mv .env.tmp .env
  fi
  printf '%s=%s\n' "\$key" "\$value" >> .env
}

upsert SPOTIFY_CLIENT_ID '${SPOTIFY_CLIENT_ID}'
upsert SPOTIFY_CLIENT_SECRET '${SPOTIFY_CLIENT_SECRET}'
upsert SPOTIFY_REFRESH_TOKEN '${SPOTIFY_REFRESH_TOKEN}'

chmod 600 .env

echo "→ recreating ${SERVICE}…"
docker compose up -d --force-recreate ${SERVICE}
sleep 4
docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}\$" \
  && echo "✓ container up" \
  || { echo "✗ container is not running" >&2; exit 1; }
REMOTE

# ------------------------------------------------------------------ verify --
echo "→ waiting for the endpoint…"
for _ in $(seq 1 12); do
  sleep 5
  payload=$(curl -sL --max-time 15 "${SITE_URL}/api/spotify" || true)
  case "$payload" in
    *'"title"'*) echo "✓ live: $payload"; exit 0 ;;
    *not_configured*) echo "  still not_configured — compose may not pass .env through" ;;
    *) echo "  $payload" ;;
  esac
done

echo "Endpoint never reported a track. Check: docker logs ${CONTAINER} --tail 50 | grep spotify" >&2
exit 1
