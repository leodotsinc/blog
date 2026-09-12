"use client";

import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * A carousel of technologies rendered as a real CSS 3D cylinder.
 */
export default function StackRing({
  items,
  radius = 118,
  className,
}: {
  items: readonly string[];
  radius?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const step = 360 / items.length;

  return (
    <div
      className={cn("mask-x relative h-[190px] w-full select-none", className)}
      style={{ perspective: 900 }}
      aria-hidden
    >
      <div
        className="preserve-3d absolute left-1/2 top-1/2 h-0 w-0"
        style={{
          animation: reduced ? undefined : "spin-ring 18s linear infinite",
        }}
      >
        {items.map((item, i) => (
          <span
            key={item}
            className="backface-hidden absolute whitespace-nowrap rounded-full border border-border/70 bg-secondary px-3 py-1.5 font-mono text-[11px] tracking-tight text-foreground/85 shadow-sm"
            style={{
              transform: `translate(-50%, -50%) rotateY(${i * step}deg) translateZ(${radius}px)`,
            }}
          >
            {item}
          </span>
        ))}
      </div>


    </div>
  );
}
