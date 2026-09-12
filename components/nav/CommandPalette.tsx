"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft, Search } from "lucide-react";

import { cn } from "@/lib/utils";

export type CommandItem = {
  title: string;
  href: string;
  group: string;
  hint?: string;
};

/**
 * Substring first, then an every-word match, then a tight subsequence on the
 * title only. A loose subsequence over the whole record matches almost
 * everything ("istio" hitting "Micro-Frontend Dashboard"), so it is deliberately
 * limited to the title and to queries long enough to mean something.
 */
function score(item: CommandItem, query: string) {
  if (!query) return 0;

  const needle = query.toLowerCase().trim();
  const title = item.title.toLowerCase();
  const hint = (item.hint ?? "").toLowerCase();

  const inTitle = title.indexOf(needle);
  if (inTitle >= 0) return 1000 - inTitle;

  const inHint = hint.indexOf(needle);
  if (inHint >= 0) return 600 - Math.min(inHint, 200);

  const words = needle.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const haystack = `${title} ${hint}`;
    if (words.every((word) => haystack.includes(word))) return 400;
  }

  /* abbreviation-style fallback, title only */
  if (needle.length >= 3 && !needle.includes(" ")) {
    let cursor = 0;
    let span = 0;
    for (const char of needle) {
      const next = title.indexOf(char, cursor);
      if (next === -1) return -1;
      span += next - cursor;
      cursor = next + 1;
    }
    /* reject matches smeared across the whole title */
    if (span <= needle.length * 6) return 200 - span;
  }

  return -1;
}

export default function CommandPalette({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!query) return items.slice(0, 8);
    return items
      .map((item) => ({ item, rank: score(item, query) }))
      .filter((entry) => entry.rank >= 0)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 8)
      .map((entry) => entry.item);
  }, [items, query]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      /* let the entrance animation start before stealing focus */
      const id = setTimeout(() => inputRef.current?.focus(), 60);
      document.documentElement.classList.add("home-locked");
      return () => {
        clearTimeout(id);
        document.documentElement.classList.remove("home-locked");
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((i) => (results.length ? (i + 1) % results.length : 0));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((i) =>
          results.length ? (i - 1 + results.length) % results.length : 0
        );
      } else if (event.key === "Enter") {
        const target = results[active];
        if (target) {
          event.preventDefault();
          onOpenChange(false);
          router.push(target.href);
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, results, active, onOpenChange, router]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[14vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Close search"
            className="absolute inset-0 bg-background/70 backdrop-blur-md"
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="glass relative w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-border/60 px-4">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search pages, posts, projects…"
                className="h-14 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
                ESC
              </kbd>
            </div>

            <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Nothing matches “{query}”.
                </p>
              ) : (
                results.map((item, index) => (
                  <button
                    key={`${item.href}-${item.title}`}
                    type="button"
                    data-index={index}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => {
                      onOpenChange(false);
                      router.push(item.href);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                      index === active ? "bg-foreground/8" : "hover:bg-foreground/5"
                    )}
                  >
                    <span className="w-16 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-glow-1">
                      {item.group}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {item.title}
                      </span>
                      {item.hint && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.hint}
                        </span>
                      )}
                    </span>
                    {index === active && (
                      <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
