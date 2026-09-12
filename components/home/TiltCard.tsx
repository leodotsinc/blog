"use client";

import {
  motion,
  useMotionTemplate,
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
  const mx = useMotionValue(50);
  const my = useMotionValue(50);

  const rotateX = useSpring(rx, { stiffness: 200, damping: 20, mass: 0.4 });
  const rotateY = useSpring(ry, { stiffness: 200, damping: 20, mass: 0.4 });

  const glow = useMotionTemplate`radial-gradient(420px circle at ${mx}% ${my}%, color-mix(in oklab, var(--glow-1) 26%, transparent), transparent 62%)`;

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
          mx.set(px * 100);
          my.set(py * 100);
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
