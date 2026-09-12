"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { headerNavLinks } from "@/data/navLinks";
import { siteMetadata } from "@/data/siteMetadata";
import { hero } from "@/data/home";
import { describeNowPlaying, useNowPlaying } from "@/lib/useNowPlaying";
import { cn } from "@/lib/utils";

const SOCIALS = [
  { label: "GitHub", href: siteMetadata.github },
  { label: "LinkedIn", href: siteMetadata.linkedin },
  { label: "Spotify", href: siteMetadata.spotify },
  { label: "Instagram", href: siteMetadata.instagram },
];

const EASE = [0.16, 1, 0.3, 1] as const;

function LocalClock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const format = () =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone: hero.timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date());

    setTime(format());
    const id = setInterval(() => setTime(format()), 1000);
    return () => clearInterval(id);
  }, []);

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
  const [hovered, setHovered] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const track = useNowPlaying();
  const status = describeNowPlaying(track);

  const links = headerNavLinks.filter((link) => !link.hidden);

  /* escape to close, and keep the page behind from scrolling */
  useEffect(() => {
    if (!open) return;

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
    <AnimatePresence>
      {open && (
        <motion.div
          key="menu"
          className="fixed inset-0 z-[60] overflow-hidden"
          initial={reduced ? { opacity: 0 } : { clipPath: "inset(0% 0% 100% 0%)" }}
          animate={reduced ? { opacity: 1 } : { clipPath: "inset(0% 0% 0% 0%)" }}
          exit={reduced ? { opacity: 0 } : { clipPath: "inset(0% 0% 100% 0%)" }}
          transition={{ duration: 0.75, ease: EASE }}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
        >
          {/* ground + ambience */}
          <div className="grain absolute inset-0 bg-background" />
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div
              className="absolute -left-[10%] top-[-15%] h-[60vmax] w-[60vmax] rounded-full opacity-45 blur-[110px]"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in oklab, var(--glow-1) 55%, transparent), transparent 68%)",
                animation: reduced ? undefined : "aurora-drift 26s ease-in-out infinite",
              }}
            />
            <div
              className="absolute -right-[12%] bottom-[-20%] h-[52vmax] w-[52vmax] rounded-full opacity-35 blur-[110px]"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in oklab, var(--glow-3) 50%, transparent), transparent 68%)",
                animation: reduced
                  ? undefined
                  : "aurora-drift 32s ease-in-out -10s infinite reverse",
              }}
            />
          </div>

          <div className="relative flex h-full w-full flex-col overflow-y-auto px-6 pb-10 pt-28 sm:px-10 lg:px-16">
            <div className="mx-auto flex w-full max-w-[80rem] flex-1 flex-col gap-12 lg:flex-row lg:items-center lg:gap-20">
              {/* nav */}
              <nav
                className="flex-1"
                onMouseLeave={() => setHovered(null)}
                aria-label="Primary"
              >
                <ul>
                  {links.map((link, index) => {
                    const isActive =
                      link.href === "/"
                        ? activeHref === "/"
                        : activeHref.startsWith(link.href);
                    const dimmed = hovered !== null && hovered !== link.href;

                    return (
                      <motion.li
                        key={link.href}
                        initial={{ opacity: 0, y: 34 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{
                          duration: 0.7,
                          delay: 0.2 + index * 0.07,
                          ease: EASE,
                        }}
                        className="border-b border-border/50 last:border-b-0"
                      >
                        <Link
                          href={link.href}
                          onClick={onClose}
                          onMouseEnter={() => setHovered(link.href)}
                          data-cursor="go"
                          className={cn(
                            "group flex items-baseline gap-5 py-4 transition-[opacity,filter] duration-400 sm:gap-8 sm:py-5",
                            dimmed ? "opacity-35 blur-[1px]" : "opacity-100"
                          )}
                        >
                          <span className="font-mono text-xs tabular-nums text-glow-1">
                            0{index + 1}
                          </span>

                          <span className="relative overflow-hidden">
                            <span
                              className={cn(
                                "block text-[clamp(2.2rem,7vw,5rem)] font-extrabold leading-[1.02] tracking-[-0.04em] transition-transform duration-500 group-hover:translate-x-3",
                                isActive ? "text-iris" : "text-foreground"
                              )}
                            >
                              {link.title}
                            </span>
                            <span className="absolute bottom-1 left-0 h-[2px] w-0 bg-gradient-to-r from-glow-2 via-glow-1 to-glow-3 transition-[width] duration-500 group-hover:w-full" />
                          </span>

                          <ArrowUpRight className="ml-auto h-5 w-5 shrink-0 translate-y-1 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 sm:h-7 sm:w-7" />
                        </Link>
                      </motion.li>
                    );
                  })}
                </ul>
              </nav>

              {/* meta column */}
              <motion.aside
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, delay: 0.45, ease: EASE }}
                className="w-full space-y-8 lg:w-[19rem]"
              >
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                    Local time
                  </p>
                  <p className="mt-2 font-mono text-2xl text-foreground">
                    <LocalClock />
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
              </motion.aside>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mx-auto mt-10 w-full max-w-[80rem] font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
            >
              Press ESC to close
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
