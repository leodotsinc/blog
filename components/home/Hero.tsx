"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useTheme } from "next-themes";
import { ArrowDown, ArrowUpRight, Mail } from "lucide-react";

import { hero, impact } from "@/data/home";
import { siteMetadata } from "@/data/siteMetadata";
import Magnetic from "./Magnetic";
import ScrambleText from "./ScrambleText";
import SplitText from "./SplitText";

const HeroCanvas = dynamic(() => import("./HeroCanvas"), { ssr: false });

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

export default function Hero() {
  const section = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [lowPower, setLowPower] = useState(false);
  const { resolvedTheme } = useTheme();
  const reduced = useReducedMotion();
  const clock = useLocalTime(hero.timezone);

  const { scrollYProgress } = useScroll({
    target: section,
    offset: ["start start", "end start"],
  });
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "34%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);
  const canvasOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0.15]);

  useEffect(() => {
    setMounted(true);
    const cores =
      typeof navigator !== "undefined" ? navigator.hardwareConcurrency ?? 8 : 8;
    setLowPower(
      window.matchMedia("(max-width: 820px)").matches || cores <= 4
    );
  }, []);

  // stop rendering WebGL once the hero has scrolled away
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
      className="relative isolate grain flex min-h-[100svh] w-full overflow-hidden"
    >
      {/* ambient aurora behind the canvas */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute left-[8%] top-[12%] h-[46vmax] w-[46vmax] rounded-full opacity-50 blur-[90px]"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--glow-1) 55%, transparent), transparent 68%)",
            animation: reduced ? undefined : "aurora-drift 22s ease-in-out infinite",
          }}
        />
        <div
          className="absolute right-[4%] top-[38%] h-[38vmax] w-[38vmax] rounded-full opacity-40 blur-[100px]"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--glow-3) 50%, transparent), transparent 68%)",
            animation: reduced
              ? undefined
              : "aurora-drift 28s ease-in-out -8s infinite reverse",
          }}
        />
      </div>

      {/* the 3d scene */}
      <motion.div className="absolute inset-0 -z-[5]" style={{ opacity: canvasOpacity }}>
        <motion.div
          className="h-full w-full"
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {mounted && (
            <HeroCanvas
              theme={theme}
              active={visible}
              reduced={Boolean(reduced)}
              quality={lowPower ? "low" : "high"}
            />
          )}
        </motion.div>
      </motion.div>

      {/* legibility scrim + bottom fade into the next section */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-[4] bg-gradient-to-r from-background via-background/80 to-background/45 md:via-background/45 md:to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-[4] h-48 bg-gradient-to-t from-background to-transparent"
      />

      {/* left rail — socials */}
      <div className="pointer-events-none absolute bottom-0 left-6 hidden lg:flex lg:flex-col lg:items-center lg:gap-6">
        <div className="pointer-events-auto flex flex-col gap-4 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground [writing-mode:vertical-rl]">
          <a
            href={siteMetadata.github}
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-foreground"
          >
            GitHub
          </a>
          <a
            href={siteMetadata.linkedin}
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-foreground"
          >
            LinkedIn
          </a>
        </div>
        <div className="h-24 w-px bg-gradient-to-b from-border to-transparent" />
      </div>

      {/* right rail — scroll cue */}
      <div className="pointer-events-none absolute bottom-0 right-6 hidden flex-col items-center gap-4 lg:flex">
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
        style={{ y: reduced ? 0 : contentY, opacity: contentOpacity }}
        className="relative mx-auto flex w-full max-w-[73rem] flex-col justify-center px-6 pb-16 pt-28 sm:px-9 xl:px-0"
      >
        {/* status chip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 flex w-fit items-center gap-3 rounded-full border border-border/70 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur-md"
        >
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
              style={{
                animation: reduced ? undefined : "pulse-dot 2s ease-in-out infinite",
              }}
            />
          </span>
          {hero.location}
          <span className="text-border">/</span>
          <span className="tabular-nums text-foreground/80">
            {clock ?? "--:--:--"}
          </span>
        </motion.div>

        {/* name */}
        <h1 className="font-sans text-[clamp(2.6rem,10.5vw,8.5rem)] font-extrabold leading-[0.88] tracking-[-0.045em]">
          <span className="block">
            <SplitText text="LEONARDO" delay={0.25} stagger={0.038} />
          </span>
          <span className="flex items-baseline overflow-hidden pb-[0.06em]">
            <motion.span
              className="text-iris inline-block"
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

        {/* role + lede */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.85, ease: [0.16, 1, 0.3, 1] }}
          className="mt-7 flex max-w-xl flex-col gap-5"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 font-mono text-sm uppercase tracking-[0.2em] text-foreground sm:text-base">
              <span className="text-glow-1">{"//"}</span>
              <ScrambleText words={hero.roles} className="min-w-[15ch]" />
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
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <Magnetic strength={0.32}>
            <Link
              href="#work"
              data-cursor="view"
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-foreground px-7 py-3.5 text-sm font-semibold text-background transition-transform duration-300"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-glow-2 via-glow-1 to-glow-3 transition-transform duration-500 group-hover:translate-x-0" />
              <span className="relative">Explore the work</span>
              <ArrowDown className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />
            </Link>
          </Magnetic>

          <Magnetic strength={0.28}>
            <Link
              href={`mailto:${siteMetadata.email}`}
              className="group inline-flex items-center gap-2 rounded-full border border-border px-6 py-3.5 text-sm font-medium text-foreground transition-colors duration-300 hover:border-glow-1"
            >
              <Mail className="h-4 w-4" />
              Say hi
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </Magnetic>
        </motion.div>

        {/* impact strip */}
        <motion.dl
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.25 }}
          className="mt-16 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-border/60 pt-8 sm:grid-cols-4"
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
      </motion.div>
    </div>
  );
}
