"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";

import { headerNavLinks } from "@/data/navLinks";
import { siteMetadata } from "@/data/siteMetadata";
import { hero } from "@/data/home";
import { describeNowPlaying, useNowPlaying } from "@/lib/useNowPlaying";
import { cn } from "@/lib/utils";
import styles from "./menu-overlay.module.css";

const SOCIALS = [
  { label: "GitHub", href: siteMetadata.github },
  { label: "LinkedIn", href: siteMetadata.linkedin },
  { label: "Spotify", href: siteMetadata.spotify },
  { label: "Instagram", href: siteMetadata.instagram },
];

function LocalClock({ active }: { active: boolean }) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: hero.timezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const format = () => formatter.format(new Date());

    setTime(format());
    const id = setInterval(() => setTime(format()), 1000);
    return () => clearInterval(id);
  }, [active]);

  return <span className="tabular-nums">{time ?? "--:--:--"}</span>;
}

export default function MenuOverlay({
  open,
  onClose,
  activeHref,
}: {
  open: boolean;
  onClose: () => void;
  activeHref: string;
}) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const track = useNowPlaying();
  const status = describeNowPlaying(track);

  const links = headerNavLinks.filter((link) => !link.hidden);

  /* escape to close, and keep the page behind from scrolling */
  useEffect(() => {
    if (!open) return;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);
    document.documentElement.classList.add("home-locked");

    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("home-locked");
    };
  }, [open, onClose]);

  return (
    <div
      id="site-menu"
      className={styles.overlay}
      data-open={open}
      role="dialog"
      aria-modal={open || undefined}
      aria-hidden={!open}
      aria-label="Site menu"
      inert={!open}
    >
      <div className={styles.surface}>
        {/* ground + ambience */}
        <div className="grain absolute inset-0 bg-background" />
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className={cn(styles.aurora, styles.auroraOne)} />
          <div className={cn(styles.aurora, styles.auroraTwo)} />
        </div>

        <div ref={scrollRef} className="relative flex h-full w-full flex-col overflow-y-auto px-6 pb-10 pt-28 sm:px-10 lg:px-16">
          <div className="mx-auto flex w-full max-w-[80rem] flex-1 flex-col gap-12 lg:flex-row lg:items-center lg:gap-20">
            {/* nav */}
            <nav
              className={cn("flex-1", styles.nav)}
              aria-label="Primary"
            >
              <ul>
                {links.map((link, index) => {
                  const isActive =
                    link.href === "/"
                      ? activeHref === "/"
                      : activeHref.startsWith(link.href);

                  return (
                    <li
                      key={link.href}
                      style={{ "--item-delay": `${0.2 + index * 0.07}s` } as CSSProperties}
                      className={cn(styles.item, "border-b border-border/50 last:border-b-0")}
                    >
                      <Link
                        href={link.href}
                        onClick={onClose}
                        prefetch={false}
                        onFocus={() => router.prefetch(link.href)}
                        onPointerEnter={(event) => {
                          if (event.pointerType === "mouse") router.prefetch(link.href);
                        }}
                        aria-current={isActive ? "page" : undefined}
                        data-cursor="go"
                        className={cn(styles.link, "flex items-baseline gap-5 py-4 sm:gap-8 sm:py-5")}
                      >
                        <span className="font-mono text-xs tabular-nums text-glow-1">
                          0{index + 1}
                        </span>

                        <span className={styles.label}>
                          <span
                            className={cn(
                              styles.title,
                              "block text-[clamp(2.2rem,7vw,5rem)] font-extrabold leading-[1.02] tracking-[-0.04em]",
                              isActive ? "text-iris" : "text-foreground"
                            )}
                          >
                            {link.title}
                          </span>
                          <span aria-hidden className={styles.underline} />
                        </span>

                        <ArrowUpRight className={cn(styles.arrow, "ml-auto h-5 w-5 shrink-0 sm:h-7 sm:w-7")} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* meta column */}
            <aside className={cn(styles.meta, "w-full space-y-8 lg:w-[19rem]")}>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                  Local time
                </p>
                <p className="mt-2 font-mono text-2xl text-foreground">
                  <LocalClock active={open} />
                </p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {hero.location}
                </p>
              </div>

              <div className="rounded-2xl border border-border/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                    {status.label}
                  </p>
                  {status.live && (
                    <span className="flex items-end gap-[3px]">
                      {[0, 1, 2].map((bar) => (
                        <span
                          key={bar}
                          className="w-[3px] rounded-full bg-[#1DB954]"
                          style={{
                            height: 12,
                            animation: `pulse-dot ${0.7 + bar * 0.2}s ease-in-out ${bar * 0.1}s infinite`,
                            animationPlayState: open ? "running" : "paused",
                          }}
                        />
                      ))}
                    </span>
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-semibold text-foreground">
                  {track?.title ?? status.detail}
                </p>
                {track?.title && (
                  <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                    {track.artist}
                  </p>
                )}
              </div>

              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                  Elsewhere
                </p>
                <ul className="mt-3 space-y-1.5">
                  {SOCIALS.map((social) => (
                    <li key={social.label}>
                      <a
                        href={social.href}
                        target="_blank"
                        rel="noreferrer"
                        className="group inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {social.label}
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <a
                href={`mailto:${siteMetadata.email}`}
                className="block font-mono text-xs text-foreground underline decoration-glow-1 decoration-2 underline-offset-4"
              >
                {siteMetadata.email}
              </a>
            </aside>
          </div>

          <p className={cn(styles.hint, "mx-auto mt-10 w-full max-w-[80rem] font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground")}>
            Press ESC to close
          </p>
        </div>
      </div>
    </div>
  );
}
