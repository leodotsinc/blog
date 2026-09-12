"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, PenLine } from "lucide-react";

import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";

export type PostItem = {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
};

export default function WritingSection({ posts }: { posts: PostItem[] }) {
  const [featured, ...rest] = posts;
  const topics = [...new Set(posts.flatMap((post) => post.tags))].slice(0, 8);

  return (
    <section
      id="writing"
      className="relative mx-auto w-full max-w-[73rem] scroll-mt-24 px-6 py-28 sm:px-9 xl:px-0"
    >
      <Reveal>
        <SectionLabel index="05">From the notebook</SectionLabel>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <h2 className="max-w-2xl text-balance text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Things I learned the{" "}
            <span className="text-muted-foreground">expensive way.</span>
          </h2>
          <Link
            href="/blog"
            className="group inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
          >
            All writing
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </Reveal>

      {featured ? (
        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <Link
              href={`/blog/${featured.slug}`}
              data-cursor="read"
              className="group relative block h-full overflow-hidden rounded-2xl border border-border/60 p-8 sm:p-10"
            >
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-glow-1/12 via-transparent to-glow-3/12 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <motion.span
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-glow-1/20 blur-3xl"
                animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              />

              <div className="relative flex h-full flex-col">
                <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  <span className="rounded-full bg-glow-1/15 px-2.5 py-1 text-glow-1">
                    Latest
                  </span>
                  <time dateTime={featured.date}>
                    {new Date(featured.date).toLocaleDateString("en-US", {
                      timeZone: "UTC",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                </div>

                <h3 className="mt-6 text-balance text-2xl font-bold leading-snug tracking-tight transition-colors duration-300 group-hover:text-glow-1 sm:text-3xl">
                  {featured.title}
                </h3>

                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {featured.description}
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-2 pt-4">
                  {featured.tags.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border/60 px-2.5 py-1 font-mono text-[10px] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <span className="mt-auto inline-flex items-center gap-2 pt-8 font-mono text-xs uppercase tracking-[0.18em] text-foreground">
                  Read it
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          </Reveal>

          <div className="flex flex-col gap-4">
            {rest.slice(0, 3).map((post, index) => (
              <Reveal key={post.slug} delay={0.08 + index * 0.06}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block rounded-2xl border border-border/60 p-6 transition-colors duration-300 hover:border-glow-1/50"
                >
                  <time className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {new Date(post.date).toLocaleDateString("en-US", {
                      timeZone: "UTC",
                      year: "numeric",
                      month: "short",
                    })}
                  </time>
                  <h3 className="mt-2 line-clamp-2 text-base font-semibold leading-snug transition-colors group-hover:text-glow-1">
                    {post.title}
                  </h3>
                </Link>
              </Reveal>
            ))}

            <Reveal delay={0.2} className="flex-1">
              <div className="flex h-full flex-col rounded-2xl border border-dashed border-border/70 p-6">
                <PenLine className="h-4 w-4 text-glow-1" />
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  More drafts than published posts — the eternal state of every
                  engineer&apos;s blog.
                </p>

                {topics.length > 0 && (
                  <div className="mt-auto pt-6">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Usually about
                    </span>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {topics.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full border border-border/60 px-2.5 py-1 font-mono text-[10px] text-muted-foreground"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      ) : (
        <p className="mt-14 text-muted-foreground">Nothing published yet.</p>
      )}
    </section>
  );
}
