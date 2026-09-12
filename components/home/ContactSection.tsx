"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Check, Copy } from "lucide-react";

import { siteMetadata } from "@/data/siteMetadata";
import Magnetic from "./Magnetic";
import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";

const LINKS = [
  { label: "GitHub", href: siteMetadata.github },
  { label: "LinkedIn", href: siteMetadata.linkedin },
  { label: "Spotify", href: siteMetadata.spotify },
  { label: "Instagram", href: siteMetadata.instagram },
];

export default function ContactSection() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(siteMetadata.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked — the mailto link is right there anyway
    }
  };

  return (
    <section
      id="contact"
      className="relative isolate mx-auto w-full max-w-[73rem] scroll-mt-24 overflow-hidden px-6 py-28 sm:px-9 xl:px-0"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[40vmax] w-[40vmax] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-[100px]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--glow-1) 45%, transparent), transparent 70%)",
        }}
      />

      <Reveal>
        <SectionLabel index="07">Say hi</SectionLabel>
      </Reveal>

      <Reveal delay={0.05}>
        <h2 className="mt-8 max-w-4xl text-balance text-4xl font-extrabold leading-[0.95] tracking-[-0.035em] sm:text-7xl">
          Got something{" "}
          <span className="text-iris">worth building?</span>
        </h2>
      </Reveal>

      <Reveal delay={0.1}>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Consulting, an architecture second opinion, or just a good argument
          about monoliths — my inbox is open.
        </p>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="mt-12 flex flex-wrap items-center gap-4">
          <Magnetic strength={0.35}>
            <Link
              href={`mailto:${siteMetadata.email}`}
              data-cursor="write"
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-foreground px-8 py-4 text-sm font-semibold text-background"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-glow-2 via-glow-1 to-glow-3 transition-transform duration-500 group-hover:translate-x-0" />
              <span className="relative">Start a conversation</span>
              <ArrowUpRight className="relative h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </Magnetic>

          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-4 font-mono text-xs text-muted-foreground transition-colors hover:border-glow-1 hover:text-foreground"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <motion.span key={copied ? "copied" : "idle"}>
              {copied ? "Copied!" : siteMetadata.email}
            </motion.span>
          </button>
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="mt-16 flex flex-wrap gap-x-8 gap-y-3 border-t border-border/60 pt-8">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
