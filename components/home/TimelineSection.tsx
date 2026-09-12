"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring } from "framer-motion";

import { timeline } from "@/data/home";
import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";

export default function TimelineSection() {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start 70%", "end 70%"],
  });
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <section className="relative mx-auto w-full max-w-[73rem] px-6 py-28 sm:px-9 xl:px-0">
      <Reveal>
        <SectionLabel index="04">Trajectory</SectionLabel>
      </Reveal>

      <Reveal delay={0.05}>
        <h2 className="mt-6 max-w-2xl text-balance text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
          Planes, payments,{" "}
          <span className="text-muted-foreground">and everything after.</span>
        </h2>
      </Reveal>

      <div ref={container} className="relative mt-16 pl-10 sm:pl-16">
        {/* rail */}
        <div className="absolute bottom-0 left-[7px] top-2 w-px bg-border sm:left-[23px]" />
        <motion.div
          style={{ scaleY }}
          className="absolute bottom-0 left-[7px] top-2 w-px origin-top bg-gradient-to-b from-glow-2 via-glow-1 to-glow-3 sm:left-[23px]"
        />

        <div className="space-y-14">
          {timeline.map((entry, index) => (
            <Reveal key={`${entry.company}-${entry.period}`} delay={index * 0.05}>
              <div className="group relative">
                {/* node */}
                <span className="absolute -left-10 top-1.5 flex h-4 w-4 items-center justify-center sm:-left-16">
                  <span className="absolute h-4 w-4 rounded-full bg-glow-1/25 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <span className="h-2 w-2 rounded-full border border-glow-1 bg-background transition-all duration-500 group-hover:scale-150 group-hover:bg-glow-1" />
                </span>

                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-5">
                  <span className="font-mono text-xs tabular-nums text-glow-1">
                    {entry.period}
                  </span>
                  <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
                    {entry.role}
                    <span className="text-muted-foreground"> · {entry.company}</span>
                  </h3>
                </div>

                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {entry.place}
                </p>

                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {entry.blurb}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {entry.tech.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-full border border-border/60 px-2.5 py-1 font-mono text-[10px] text-muted-foreground transition-colors duration-300 group-hover:border-glow-1/40"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
