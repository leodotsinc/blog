"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useTheme } from "next-themes";
import { ArrowDown, ArrowUpRight } from "lucide-react";

import { hero, impact } from "@/data/home";
import Magnetic from "./Magnetic";
import ScrambleText from "./ScrambleText";
import SplitText from "./SplitText";
import HeroArtwork from "./HeroArtwork";

function useLocalTime(timeZone: string) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const format = () =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date());

    setTime(format());
    const id = setInterval(() => setTime(format()), 1000);
    return () => clearInterval(id);
  }, [timeZone]);

  return time;
}

function LocalClock({ timeZone }: { timeZone: string }) {
  const time = useLocalTime(timeZone);
  return <span className="tabular-nums text-foreground/80">{time ?? "--:--:--"}</span>;
}

export default function Hero() {
  const section = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [enhanced, setEnhanced] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const { resolvedTheme } = useTheme();
  const reduced = useReducedMotion();
  const animated = enhanced && !reduced;

  const { scrollYProgress } = useScroll({
    target: section,
    offset: ["start start", "end start"],
  });
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.92], [1, 0]);

  useEffect(() => {
    const media = window.matchMedia(
      "(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)"
    );
    const update = () => setEnhanced(media.matches && (navigator.hardwareConcurrency ?? 8) > 4);
    const visibility = () => setPageVisible(document.visibilityState === "visible");
    update();
    visibility();
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  // Pause the cycling role when the hero scrolls away; the artwork owns its render lifecycle.
  useEffect(() => {
    const node = section.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const theme = resolvedTheme === "light" ? "light" : "dark";

  return (
    <div
      ref={section}
      data-enhanced={animated}
      className="hero relative isolate flex min-h-[100svh] w-full flex-col overflow-hidden"
    >
      <div aria-hidden className="hero-ambient grain pointer-events-none absolute inset-0 -z-10" />

      {/* right rail — scroll cue */}
      <div className="pointer-events-none absolute bottom-10 right-6 hidden flex-col items-center gap-4 lg:flex">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground [writing-mode:vertical-rl]">
          Scroll
        </span>
        <div className="relative h-24 w-px overflow-hidden bg-border">
          <span
            className="absolute inset-x-0 top-0 h-8 bg-glow-1"
            style={{
              animation: reduced ? undefined : "scroll-hint 2.2s ease-in-out infinite",
            }}
          />
        </div>
      </div>

      <motion.div
        style={{ y: animated ? contentY : 0, opacity: animated ? contentOpacity : 1 }}
        className="relative mx-auto flex min-w-0 w-full max-w-[73rem] flex-1 flex-col justify-center px-6 pb-16 pt-28 sm:px-9 lg:min-h-[54rem] xl:px-0"
      >
        {/* status chip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 flex max-w-full w-fit flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-border/70 bg-background/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:text-[11px] sm:tracking-[0.18em]"
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span
              className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
              style={{
                animation: animated ? "pulse-dot 2s ease-in-out infinite" : undefined,
              }}
            />
          </span>
          <span className="whitespace-nowrap">{hero.location}</span>
          <span className="text-border">/</span>
          <LocalClock timeZone={hero.timezone} />
        </motion.div>

        {/* name */}
        <h1 className="relative z-10 pointer-events-none font-sans text-[clamp(2.6rem,10.5vw,8.5rem)] font-extrabold leading-[0.88] tracking-[-0.045em]">
          <span className="block">
            <SplitText text="LEONARDO" className="flex-nowrap whitespace-nowrap" delay={0.25} stagger={0.038} />
          </span>
          <span className="flex items-baseline overflow-hidden pb-[0.06em]">
            <motion.span
              className="text-iris inline-block pr-[0.08em] -mr-[0.08em]"
              initial={{ y: "110%" }}
              animate={{ y: "0%" }}
              transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              TORRES
            </motion.span>
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.1, type: "spring", stiffness: 260, damping: 14 }}
              className="ml-3 mb-[0.1em] inline-block h-[0.13em] w-[0.13em] self-end rounded-full bg-glow-1"
            />
          </span>
        </h1>

        <HeroArtwork theme={theme} />

        {/* role + lede */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.85, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 mt-4 flex max-w-xl flex-col gap-5 lg:mt-7 lg:max-w-[29rem]"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 font-mono text-sm uppercase tracking-[0.2em] text-foreground sm:text-base">
              <span className="text-glow-1">{"//"}</span>
              <ScrambleText words={hero.roles} active={Boolean(animated && visible && pageVisible)} className="min-w-0" />
            </div>
            <p className="font-mono text-xs tracking-tight text-muted-foreground">
              currently{" "}
              <span className="text-foreground">{hero.current.role}</span> at{" "}
              <span className="text-foreground">{hero.current.company}</span>
            </p>
          </div>

          <p className="text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            {hero.lede}
          </p>
        </motion.div>

        {/* actions */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 mt-10 flex flex-wrap items-center gap-4"
        >
          <Magnetic strength={0.32}>
            <Link
              href="#architecture-lab"
              data-cursor="view"
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-foreground px-7 py-3.5 text-sm font-semibold text-background transition-transform duration-300"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-glow-2 via-glow-1 to-glow-3 transition-transform duration-500 group-hover:translate-x-0" />
              <span className="relative">Try to break it</span>
              <ArrowDown className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />
            </Link>
          </Magnetic>

          <Magnetic strength={0.28}>
            <Link
              href="#work"
              className="group inline-flex items-center gap-2 rounded-full border border-border px-6 py-3.5 text-sm font-medium text-foreground transition-colors duration-300 hover:border-glow-1"
            >
              Selected work
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </Magnetic>
        </motion.div>
        <p className="relative z-10 mt-4 flex max-w-[29rem] flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] tracking-wide text-muted-foreground">
          <span>An interactive experiment in designing for failure.</span>
          <Link href="#decision-room" className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline">Or make the architecture call <ArrowUpRight size={12} aria-hidden /></Link>
        </p>

      </motion.div>

      {/* Impact strip: deliberately outside the parallax + fade wrapper. Inside
          it, the numbers drifted down as you scrolled toward them and were
          already faded out by the time the stack band reached them. */}
      <motion.dl
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 1.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto grid w-full max-w-[73rem] grid-cols-2 gap-x-6 gap-y-6 border-t border-border/60 px-6 pb-12 pt-8 sm:grid-cols-4 sm:px-9 xl:px-0"
      >
        {impact.map((item) => (
          <div key={item.label} className="group" title={item.hint}>
            <dt className="font-sans text-2xl font-bold tabular-nums text-foreground transition-colors duration-300 group-hover:text-glow-1 sm:text-3xl">
              {item.value}
            </dt>
            <dd className="mt-1 font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-muted-foreground">
              {item.label}
            </dd>
          </div>
        ))}
      </motion.dl>
    </div>
  );
}
