"use client";

import { describeNowPlaying, useNowPlaying } from "@/lib/useNowPlaying";

const BARS = [0, 1, 2, 3];

export default function NowPlayingCard() {
  const data = useNowPlaying();
  const status = describeNowPlaying(data);
  const playing = status.live;

  return (
    <div className="flex h-full flex-col justify-between p-6">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {status.label}
        </span>
        <div className="flex h-4 items-end gap-[3px]">
          {BARS.map((bar) => (
            <span
              key={bar}
              className="w-[3px] rounded-full bg-[#1DB954]"
              style={{
                height: playing ? "100%" : "25%",
                animation: playing
                  ? `pulse-dot ${0.6 + bar * 0.18}s ease-in-out ${bar * 0.1}s infinite`
                  : undefined,
                transformOrigin: "bottom",
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-secondary">
          {data?.albumImageUrl ? (
            // remote Spotify CDN art — plain img keeps next.config free of remote patterns
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.albumImageUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full animate-pulse bg-gradient-to-br from-glow-2/30 to-glow-1/30" />
          )}
        </div>

        <div className="min-w-0">
          <a
            href={data?.songUrl ?? "https://open.spotify.com/user/lleotorres"}
            target="_blank"
            rel="noreferrer"
            className="line-clamp-2 text-sm font-semibold text-foreground transition-colors hover:text-glow-1"
          >
            {data?.title ?? status.detail}
          </a>
          {data?.title && (
            <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
              {data.artist}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
