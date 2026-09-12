/**
 * Spotify Web API client.
 *
 * The access token is cached in module scope: a refresh-token exchange costs a
 * round trip, and the previous version paid for two of them on every single
 * request (one per endpoint call).
 */

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;

const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
/* asking for episodes as well, otherwise podcasts come back as item: null */
const NOW_PLAYING_ENDPOINT =
  "https://api.spotify.com/v1/me/player/currently-playing?additional_types=track,episode";
const RECENTLY_PLAYED_ENDPOINT =
  "https://api.spotify.com/v1/me/player/recently-played?limit=1";

export type SpotifyFailure =
  | "not_configured"
  /** Spotify refused the refresh-token exchange: bad client creds or a revoked token. */
  | "token_rejected"
  /** Token is valid but the API said no: almost always a missing scope. */
  | "api_unauthorized"
  | "request_failed"
  | "nothing_playing"
  | "no_history";

export type TokenResult =
  | { ok: true; token: string }
  | { ok: false; error: "token_rejected" | "request_failed" };

export const isConfigured = () =>
  Boolean(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN);

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<TokenResult> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return { ok: true, token: cachedToken.value };
  }

  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

  let response: Response;
  try {
    response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: REFRESH_TOKEN!,
      }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("[spotify] token request threw", error);
    return { ok: false, error: "request_failed" };
  }

  if (!response.ok) {
    /* the body carries Spotify's own explanation — invalid_grant means the
       refresh token was revoked and a new one has to be minted */
    const body = await response.text().catch(() => "");
    console.error(
      `[spotify] token exchange failed: ${response.status} ${body.slice(0, 200)}`
    );
    cachedToken = null;
    return { ok: false, error: "token_rejected" };
  }

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!data.access_token) {
    console.error("[spotify] token response had no access_token");
    return { ok: false, error: "token_rejected" };
  }

  cachedToken = {
    value: data.access_token,
    /* refresh a minute early so a request never races the expiry */
    expiresAt: Date.now() + ((data.expires_in ?? 3600) - 60) * 1000,
  };

  return { ok: true, token: cachedToken.value };
}

export type FetchResult =
  | { ok: true; response: Response }
  | { ok: false; error: "token_rejected" | "request_failed" };

async function authorizedGet(url: string): Promise<FetchResult> {
  const token = await getAccessToken();
  if (!token.ok) return token;

  try {
    return { ok: true, response: await fetch(url, {
      headers: { Authorization: `Bearer ${token.token}` },
      cache: "no-store",
    }) };
  } catch (error) {
    console.error("[spotify] request threw", error);
    return { ok: false, error: "request_failed" };
  }
}

export const getNowPlaying = () => authorizedGet(NOW_PLAYING_ENDPOINT);
export const getRecentlyPlayed = () => authorizedGet(RECENTLY_PLAYED_ENDPOINT);

/** Drops the cached token so the next call re-authenticates. */
export const invalidateToken = () => {
  cachedToken = null;
};
