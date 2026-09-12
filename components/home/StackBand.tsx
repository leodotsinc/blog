"use client";

import { stack } from "@/data/home";
import Marquee from "./Marquee";

export default function StackBand() {
  return (
    <div className="relative isolate border-y border-border/60 py-10">
      <p className="mb-5 text-center font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
        Tools I happen to use · the thinking above is the part that travels
      </p>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-glow-1/5 to-transparent"
      />
      <Marquee
        items={stack}
        baseVelocity={2.2}
        className="font-sans text-lg font-semibold tracking-tight text-foreground/70 sm:text-2xl"
      />
      <Marquee
        items={[...stack].reverse()}
        baseVelocity={-1.4}
        separator="•"
        className="mt-4 font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground sm:text-sm"
      />
    </div>
  );
}
