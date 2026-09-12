"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A card that leans toward the cursor and carries a spotlight that follows it.
 */
export default function TiltCard({
  children,
  className,
  intensity = 7,
  spotlight = true,
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
  spotlight?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const rotateX = useSpring(rx, { stiffness: 200, damping: 20, mass: 0.4 });
  const rotateY = useSpring(ry, { stiffness: 200, damping: 20, mass: 0.4 });

  /* The spotlight used to be a background-image rebuilt on every pointer
     move, which repaints the whole card. A fixed-size layer translated into
     place is pure compositing instead. */
  const glowX = useSpring(mx, { stiffness: 260, damping: 30, mass: 0.4 });
  const glowY = useSpring(my, { stiffness: 260, damping: 30, mass: 0.4 });

  return (
    <div className={cn("relative", className)} style={{ perspective: 1100 }}>
      <motion.div
        ref={ref}
        className="group/tilt relative h-full w-full rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm transition-colors duration-300 hover:border-glow-1/45"
        style={{
          rotateX: reduced ? 0 : rotateX,
          rotateY: reduced ? 0 : rotateY,
          transformStyle: "preserve-3d",
        }}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") setHovered(true);
        }}
        onPointerMove={(event) => {
          const rect = ref.current?.getBoundingClientRect();
          if (!rect) return;
          const px = (event.clientX - rect.left) / rect.width;
          const py = (event.clientY - rect.top) / rect.height;
          mx.set(event.clientX - rect.left - 210);
          my.set(event.clientY - rect.top - 210);
          if (reduced || event.pointerType === "touch") return;
          rx.set((0.5 - py) * intensity * 2);
          ry.set((px - 0.5) * intensity * 2);
        }}
        onPointerLeave={() => {
          setHovered(false);
          rx.set(0);
          ry.set(0);
        }}
      >
        {spotlight && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{ background: glow }}
            animate={{ opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
        <div className="relative h-full" style={{ transform: "translateZ(38px)" }}>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
