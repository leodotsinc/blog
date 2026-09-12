import { NextResponse } from "next/server";

import {
  getNowPlaying,
  getRecentlyPlayed,
  invalidateToken,
  isConfigured,
  type SpotifyFailure,
} from "@/lib/spotify";

export const dynamic = "force-dynamic";

type Artist = { name: string };

type SpotifyItem = {
  type?: "track" | "episode";
  name?: string;
  artists?: Artist[];
  album?: { name?: string; images?: { url: string }[] };
  /* podcast episodes carry a show instead of an album */
  show?: { name?: string; publisher?: string };
  images?: { url: string }[];
  external_urls?: { spotify?: string };
};

export type NowPlayingPayload = {
  isPlaying: boolean;
  title?: string;
  artist?: string;
  album?: string;
  albumImageUrl?: string;
  songUrl?: string;
  isPodcast?: boolean;
  /** Why there is nothing to show — distinguishes silence from a broken setup. */
  reason?: SpotifyFailure;
};

/** Flattens both track and episode payloads into one shape. */
function normalize(item: SpotifyItem | null | undefined) {
  if (!item?.name) return null;

  const isPodcast = item.type === "episode";

  return {
    title: item.name,
    artist: isPodcast
      ? item.show?.name ?? item.show?.publisher ?? "Podcast"
      : (item.artists ?? []).map((a) => a.name).filter(Boolean).join(", ") ||
        "Unknown artist",
    album: isPodcast ? item.show?.name : item.album?.name,
    albumImageUrl: isPodcast
      ? item.images?.[0]?.url
      : item.album?.images?.[0]?.url,
    songUrl: item.external_urls?.spotify,
    isPodcast,
  };
}

const json = (payload: NowPlayingPayload, status = 200) =>
  NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });

async function readRecentlyPlayed(): Promise<NowPlayingPayload> {
  const response = await getRecentlyPlayed();

  if (!response) return { isPlaying: false, reason: "auth_failed" };

  if (!response.ok) {
    console.error(`[spotify] recently-played failed: ${response.status}`);
    return {
      isPlaying: false,
      reason: response.status === 401 ? "auth_failed" : "request_failed",
    };
  }

  const data = (await response.json().catch(() => null)) as {
    items?: { track?: SpotifyItem }[];
  } | null;

  const track = normalize(data?.items?.[0]?.track);
  if (!track) return { isPlaying: false, reason: "no_history" };

  return { isPlaying: false, ...track };
}

export async function GET() {
  if (!isConfigured()) {
    console.error(
      "[spotify] missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET / SPOTIFY_REFRESH_TOKEN"
    );
    return json({ isPlaying: false, reason: "not_configured" });
  }

  let response = await getNowPlaying();

  /* a stale cached token surfaces as a single 401 — drop it and try again */
  if (response?.status === 401) {
    invalidateToken();
    response = await getNowPlaying();
  }

  if (!response) return json({ isPlaying: false, reason: "auth_failed" });

  /* 204 means the player is idle, not that something broke */
  if (response.status === 204) return json(await readRecentlyPlayed());

  if (!response.ok) {
    console.error(`[spotify] currently-playing failed: ${response.status}`);
    if (response.status === 401 || response.status === 403) {
      return json({ isPlaying: false, reason: "auth_failed" });
    }
    return json(await readRecentlyPlayed());
  }

  const data = (await response.json().catch(() => null)) as {
    is_playing?: boolean;
    item?: SpotifyItem;
  } | null;

  const track = normalize(data?.item);

  /* player open but between tracks, or playing a local file */
  if (!track) return json(await readRecentlyPlayed());

  return json({ isPlaying: Boolean(data?.is_playing), ...track });
}
