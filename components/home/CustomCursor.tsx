"use client";

import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Blend-mode cursor: a hard dot that tracks instantly and a lagging ring that
 * swells over anything interactive. Desktop pointers only.
 */
export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [label, setLabel] = useState<string | null>(null);

  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const ringX = useSpring(x, { stiffness: 380, damping: 32, mass: 0.5 });
  const ringY = useSpring(y, { stiffness: 380, damping: 32, mass: 0.5 });

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const coarseOk = fine.matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!coarseOk) return;

    setEnabled(true);
    document.documentElement.classList.add("has-custom-cursor");

    const move = (event: PointerEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);
    };

    const over = (event: PointerEvent) => {
      const target = (event.target as HTMLElement | null)?.closest?.(
        "a, button, [role='button'], input, textarea, [data-cursor]"
      ) as HTMLElement | null;
      setHovering(Boolean(target));
      setLabel(target?.dataset?.cursor ?? null);
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", over, { passive: true });

    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, [x, y]);

  if (!enabled) return null;

  // The blend lives on the two small marks, not on a full-viewport layer.
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] hidden md:block">
      <motion.div className="absolute left-0 top-0" style={{ x, y }}>
        <span className="block h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
      </motion.div>

      <motion.div className="absolute left-0 top-0" style={{ x: ringX, y: ringY }}>
      <motion.div
        className="flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80"
        animate={{
          width: label ? 84 : hovering ? 52 : 30,
          height: label ? 84 : hovering ? 52 : 30,
          opacity: hovering ? 1 : 0.5,
        }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
      >
        <AnimatePresence>
          {label && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-white"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
      </motion.div>
    </div>
  );
}
