"use client";

import { motion } from "framer-motion";

import { principles } from "@/data/home";
import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";

export default function PrinciplesSection() {
  return (
    <section
      id="approach"
      className="relative mx-auto w-full max-w-[73rem] scroll-mt-24 px-6 py-28 sm:px-9 xl:px-0"
    >
      <Reveal>
        <SectionLabel index="01">How I operate</SectionLabel>
      </Reveal>

      <Reveal delay={0.05}>
        <h2 className="mt-6 max-w-3xl text-balance text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
          The stack is the easy part.{" "}
          <span className="text-muted-foreground">
            What survives a migration is how you think.
          </span>
        </h2>
      </Reveal>

      <div className="mt-14 grid gap-4 md:grid-cols-2">
        {principles.map((item, index) => (
          <Reveal key={item.title} delay={index * 0.07}>
            <article className="group relative h-full overflow-hidden rounded-2xl border border-border/60 p-7 transition-colors duration-500 hover:border-glow-1/45 sm:p-8">
              {/* the accent bar grows instead of a background repaint */}
              <motion.span
                aria-hidden
                className="absolute inset-y-0 left-0 w-[2px] origin-top bg-gradient-to-b from-glow-2 via-glow-1 to-glow-3"
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, margin: "-15% 0px" }}
                transition={{
                  duration: 0.8,
                  delay: 0.15 + index * 0.07,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />

              <div className="flex items-baseline gap-4">
                <span className="font-mono text-xs tabular-nums text-glow-1">
                  0{index + 1}
                </span>
                <h3 className="text-xl font-bold leading-snug tracking-tight sm:text-2xl">
                  {item.title}
                </h3>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {item.body}
              </p>

              <p className="mt-6 inline-flex rounded-full border border-border/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors duration-500 group-hover:border-glow-1/40 group-hover:text-foreground">
                {item.proof}
              </p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
