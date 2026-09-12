"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, GraduationCap, Sparkles } from "lucide-react";

import { education, facts, stack } from "@/data/home";
import { siteMetadata } from "@/data/siteMetadata";
import NowPlayingCard from "./NowPlayingCard";
import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";
import StackRing from "./StackRing";
import TiltCard from "./TiltCard";
import WavingHand from "@/components/WavingHand";

export default function BentoSection() {
  return (
    <section
      id="about"
      className="relative mx-auto w-full max-w-[73rem] px-6 py-28 sm:px-9 xl:px-0"
    >
      <Reveal>
        <SectionLabel index="01">The human behind the commits</SectionLabel>
      </Reveal>

      <Reveal delay={0.05}>
        <h2 className="mt-6 max-w-3xl text-balance text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
          Engineering is 20% code and 80% deciding{" "}
          <span className="text-muted-foreground">what not to build.</span>
        </h2>
      </Reveal>

      <div className="mt-14 grid gap-4 md:grid-cols-6">
        {/* intro */}
        <Reveal delay={0.05} className="md:col-span-4">
          <TiltCard className="h-full" intensity={5}>
            <div className="flex h-full flex-col gap-6 p-7 sm:flex-row sm:items-start">
              <div className="relative shrink-0">
                <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-glow-2/40 via-glow-1/30 to-glow-3/40 blur-lg" />
                <Image
                  src="/profile-image.jpg"
                  alt="Leonardo Torres"
                  width={104}
                  height={104}
                  className="relative h-[104px] w-[104px] rounded-full border border-border/60 object-cover"
                />
              </div>

              <div>
                <h3 className="flex items-center text-xl font-bold">
                  Hi
                  <WavingHand className="wave mx-2 inline-block h-6 w-6" />
                  I&apos;m Leonardo
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Brazilian engineer, currently tech lead at Getnet —
                  Santander&apos;s payments arm. I like systems that survive
                  contact with production: boring deploys, honest observability,
                  and architecture a new hire can read on their first afternoon.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Lately I spend my time wiring AI into places it actually
                  earns its keep — and over-engineering this blog on the side.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {["Java", "Go", "Python", "TypeScript", "Kubernetes"].map(
                    (tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-border/70 px-3 py-1 font-mono text-[11px] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          </TiltCard>
        </Reveal>

        {/* stack ring */}
        <Reveal delay={0.12} className="md:col-span-2">
          <TiltCard className="h-full" intensity={6}>
            <div className="flex h-full flex-col overflow-hidden p-6">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                The toolbox
              </span>
              <StackRing items={stack.slice(0, 11)} className="my-auto" />
            </div>
          </TiltCard>
        </Reveal>

        {/* spotify */}
        <Reveal delay={0.05} className="md:col-span-2">
          <TiltCard className="h-full" intensity={6}>
            <NowPlayingCard />
          </TiltCard>
        </Reveal>

        {/* education */}
        <Reveal delay={0.12} className="md:col-span-2">
          <TiltCard className="h-full" intensity={6}>
            <div className="flex h-full flex-col p-6">
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                <GraduationCap className="h-3.5 w-3.5" />
                Studied
              </span>
              <ul className="mt-5 space-y-4">
                {education.map((item) => (
                  <li key={item.degree}>
                    <p className="text-sm font-semibold leading-snug text-foreground">
                      {item.degree}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {item.school} · {item.period}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </TiltCard>
        </Reveal>

        {/* facts */}
        <Reveal delay={0.19} className="md:col-span-2">
          <TiltCard className="h-full" intensity={6}>
            <div className="flex h-full flex-col p-6">
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                Off the clock
              </span>
              <ul className="mt-5 space-y-3">
                {facts.map((fact) => (
                  <li
                    key={fact}
                    className="flex gap-3 text-sm leading-snug text-muted-foreground"
                  >
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-glow-1" />
                    {fact}
                  </li>
                ))}
              </ul>

              <Link
                href="/about"
                className="group mt-auto inline-flex items-center gap-1.5 pt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-foreground"
              >
                Full story
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </TiltCard>
        </Reveal>
      </div>

      <Reveal delay={0.1}>
        <p className="mt-8 text-center font-mono text-[11px] text-muted-foreground">
          Reach me at{" "}
          <a
            href={`mailto:${siteMetadata.email}`}
            className="text-foreground underline decoration-glow-1 decoration-2 underline-offset-4"
          >
            {siteMetadata.email}
          </a>
        </p>
      </Reveal>
    </section>
  );
}
