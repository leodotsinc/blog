"use client";

import { useEffect, useState } from "react";

export type NowPlaying = {
  isPlaying: boolean;
  title?: string;
  artist?: string;
  album?: string;
  albumImageUrl?: string;
  songUrl?: string;
  isPodcast?: boolean;
  reason?:
    | "not_configured"
    | "token_rejected"
    | "api_unauthorized"
    | "request_failed"
    | "nothing_playing"
    | "no_history";
};

/**
 * One poller shared by every subscriber — the header, the bento card and the
 * footer all want the same track, and three independent intervals would just
 * burn requests against the same endpoint.
 */
let current: NowPlaying | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let inFlight: Promise<void> | null = null;
const subscribers = new Set<(value: NowPlaying | null) => void>();

const POLL_MS = 30_000;

async function load() {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const response = await fetch("/api/spotify");
      current = (await response.json()) as NowPlaying;
    } catch {
      current = { isPlaying: false, reason: "request_failed" };
    }
    subscribers.forEach((notify) => notify(current));
    inFlight = null;
  })();

  return inFlight;
}

function subscribe(notify: (value: NowPlaying | null) => void) {
  subscribers.add(notify);

  if (current) notify(current);
  if (subscribers.size === 1) {
    load();
    timer = setInterval(load, POLL_MS);
  }

  return () => {
    subscribers.delete(notify);
    if (subscribers.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function useNowPlaying() {
  const [data, setData] = useState<NowPlaying | null>(current);

  useEffect(() => subscribe(setData), []);

  return data;
}

/** Human-readable line for whatever state the integration is in. */
export function describeNowPlaying(data: NowPlaying | null) {
  if (!data) return { label: "Connecting", detail: "…", live: false };

  if (data.title) {
    return {
      label: data.isPlaying ? "Now playing" : "Last played",
      detail: data.artist ?? "",
      live: data.isPlaying,
    };
  }

  switch (data.reason) {
    case "not_configured":
      return { label: "Spotify", detail: "Not connected", live: false };
    case "token_rejected":
    case "api_unauthorized":
      return { label: "Spotify", detail: "Reconnect needed", live: false };
    case "no_history":
      return { label: "Spotify", detail: "No recent tracks", live: false };
    default:
      return { label: "Spotify", detail: "Silence, for once", live: false };
  }
}
