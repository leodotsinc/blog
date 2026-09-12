"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";

export type WorkItem = {
  slug: string;
  title: string;
  description: string;
  year: string;
  tags: string[];
  featured?: boolean;
};

const GRADIENTS = [
  "linear-gradient(135deg, #6d5efc 0%, #89cff0 100%)",
  "linear-gradient(135deg, #f472b6 0%, #6d5efc 100%)",
  "linear-gradient(135deg, #22d3ee 0%, #4f46e5 100%)",
  "linear-gradient(135deg, #fb923c 0%, #db2777 100%)",
];

export default function WorkSection({ items }: { items: WorkItem[] }) {
  const [active, setActive] = useState<number | null>(null);
  const reduced = useReducedMotion();
  const listRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const px = useSpring(x, { stiffness: 260, damping: 28, mass: 0.6 });
  const py = useSpring(y, { stiffness: 260, damping: 28, mass: 0.6 });

  return (
    <section
      id="work"
      className="relative mx-auto w-full max-w-[73rem] scroll-mt-24 px-6 py-28 sm:px-9 xl:px-0"
    >
      <Reveal>
        <SectionLabel index="02">Selected work</SectionLabel>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <h2 className="max-w-2xl text-balance text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Systems that had to{" "}
            <span className="text-iris">stay up</span>.
          </h2>
          <Link
            href="/projects"
            className="group inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
          >
            All projects
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </Reveal>

      <div
        ref={listRef}
        className="mt-14"
        onPointerMove={(event) => {
          x.set(event.clientX);
          y.set(event.clientY);
        }}
        onPointerLeave={() => setActive(null)}
      >
        {items.map((item, index) => (
          <Reveal key={item.slug} delay={index * 0.06}>
            <Link
              href={`/projects/${item.slug}`}
              data-cursor="open"
              onPointerEnter={() => setActive(index)}
              className="group relative block border-t border-border/60 py-8 last:border-b"
            >
              {/* hover wash */}
              <span className="pointer-events-none absolute inset-x-[-1.5rem] inset-y-0 -z-10 scale-95 rounded-2xl bg-gradient-to-r from-glow-1/10 via-glow-2/5 to-transparent opacity-0 transition-all duration-500 group-hover:scale-100 group-hover:opacity-100" />

              <motion.div
                animate={{ opacity: active === null || active === index ? 1 : 0.32 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col gap-4 md:flex-row md:items-center md:gap-10"
              >
                <span className="font-mono text-xs tabular-nums text-muted-foreground md:w-16">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="min-w-0 flex-1">
                  <h3 className="text-2xl font-bold leading-tight tracking-tight transition-transform duration-500 group-hover:translate-x-2 sm:text-4xl">
                    {item.title}
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.tags.slice(0, 5).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-border/60 px-2.5 py-1 font-mono text-[10px] tracking-tight text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-5 md:flex-col md:items-end md:gap-3">
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {item.year}
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-all duration-500 group-hover:rotate-45 group-hover:border-glow-1 group-hover:bg-glow-1/10">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </motion.div>
            </Link>
          </Reveal>
        ))}
      </div>

      {/* cursor-following poster */}
      {!reduced && (
        <AnimatePresence>
          {active !== null && items[active] && (
            <motion.div
              key="preview"
              style={{ x: px, y: py }}
              className="pointer-events-none fixed left-0 top-0 z-40 hidden lg:block"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.85, rotate: -6 }}
                animate={{ opacity: 1, scale: 1, rotate: -3 }}
                exit={{ opacity: 0, scale: 0.85, rotate: -6 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="relative -ml-40 -mt-30 h-60 w-80 overflow-hidden rounded-2xl border border-white/20 shadow-2xl"
              >
                <div
                  className="absolute inset-0"
                  style={{ background: GRADIENTS[active % GRADIENTS.length] }}
                />
                <div className="grain absolute inset-0" />
                <div className="absolute inset-0 flex flex-col justify-between p-6 text-white">
                  <span className="font-mono text-[10px] uppercase tracking-[0.24em] opacity-80">
                    {items[active].featured ? "Featured" : "Case study"}
                  </span>
                  <div>
                    <p className="text-lg font-bold leading-tight">
                      {items[active].title}
                    </p>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] opacity-80">
                      {items[active].tags.slice(0, 3).join(" · ")}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </section>
  );
}
