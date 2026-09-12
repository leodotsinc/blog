"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Per-character curtain reveal. Each glyph rotates up from behind a mask.
 */
export default function SplitText({
  text,
  className,
  charClassName,
  delay = 0,
  stagger = 0.035,
  play = true,
}: {
  text: string;
  className?: string;
  charClassName?: string;
  delay?: number;
  stagger?: number;
  play?: boolean;
}) {
  const reduced = useReducedMotion();
  const chars = Array.from(text);

  if (reduced) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={cn("inline-flex flex-wrap", className)} aria-label={text}>
      {chars.map((char, i) => (
        <span
          key={`${char}-${i}`}
          aria-hidden
          /* the curtain needs a vertical clip, but with negative tracking the
             box is narrower than the glyph ink and letters like "S" lose their
             right edge — pad the clip box out and pull the layout back */
          className="inline-block overflow-hidden align-bottom px-[0.07em] -mx-[0.07em]"
          style={{ perspective: 600 }}
        >
          <motion.span
            className={cn("inline-block will-change-transform", charClassName)}
            initial={{ y: "110%", rotateX: -70, opacity: 0 }}
            animate={play ? { y: "0%", rotateX: 0, opacity: 1 } : undefined}
            transition={{
              duration: 0.9,
              delay: delay + i * stagger,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {char === " " ? " " : char}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
