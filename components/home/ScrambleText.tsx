"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!<>-_\\/[]{}=+*^?#";

/**
 * Cycles through `words`, decoding each one character by character.
 */
export default function ScrambleText({
  words,
  interval = 2800,
  className,
}: {
  words: readonly string[];
  interval?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [display, setDisplay] = useState(words[0] ?? "");
  const current = useRef(words[0] ?? "");
  const reduced = useReducedMotion();

  useEffect(() => {
    if (words.length < 2) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % words.length),
      interval
    );
    return () => clearInterval(id);
  }, [words, interval]);

  useEffect(() => {
    const to = words[index] ?? "";

    if (reduced) {
      current.current = to;
      setDisplay(to);
      return;
    }

    const from = current.current;
    const length = Math.max(from.length, to.length);
    const queue = Array.from({ length }, (_, i) => ({
      from: from[i] ?? "",
      to: to[i] ?? "",
      start: Math.floor(Math.random() * 16),
      end: Math.floor(Math.random() * 16) + 18,
      char: "",
    }));

    let frame = 0;
    let raf = 0;

    const tick = () => {
      let output = "";
      let done = 0;

      for (const q of queue) {
        if (frame >= q.end) {
          done++;
          output += q.to;
        } else if (frame >= q.start) {
          if (!q.char || Math.random() < 0.3) {
            q.char = CHARS[Math.floor(Math.random() * CHARS.length)];
          }
          output += q.char;
        } else {
          output += q.from;
        }
      }

      setDisplay(output);

      if (done === queue.length) {
        current.current = to;
        return;
      }
      frame++;
      raf = requestAnimationFrame(tick);
    };

    tick();
    return () => cancelAnimationFrame(raf);
  }, [index, words, reduced]);

  return (
    <span className={cn("inline-block", className)} aria-label={words[index]}>
      <span aria-hidden>{display}</span>
    </span>
  );
}
