"use client";

import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

const wrap = (min: number, max: number, value: number) => {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
};

/**
 * Infinite marquee whose speed and direction bend with the scroll velocity.
 */
export default function Marquee({
  items,
  baseVelocity = 3,
  className,
  itemClassName,
  separator = "✦",
}: {
  items: readonly string[];
  baseVelocity?: number;
  className?: string;
  itemClassName?: string;
  separator?: string;
}) {
  const baseX = useMotionValue(0);
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400,
  });
  const velocityFactor = useTransform(smoothVelocity, [0, 1200], [0, 4], {
    clamp: false,
  });
  const skew = useTransform(smoothVelocity, [-2000, 0, 2000], [6, 0, -6], {
    clamp: true,
  });

  const direction = useRef(1);

  useAnimationFrame((_, delta) => {
    if (reduced) return;
    let moveBy = direction.current * baseVelocity * (delta / 1000);

    const factor = velocityFactor.get();
    if (factor < 0) direction.current = -1;
    else if (factor > 0) direction.current = 1;

    moveBy += direction.current * moveBy * Math.abs(factor);
    baseX.set(baseX.get() + moveBy);
  });

  const x = useTransform(baseX, (value) => `${wrap(-25, 0, value)}%`);

  const row = (key: number) => (
    <span key={key} className="flex shrink-0 items-center">
      {items.map((item) => (
        <span key={`${key}-${item}`} className="flex items-center">
          <span className={cn("px-5", itemClassName)}>{item}</span>
          <span className="text-glow-1/50" aria-hidden>
            {separator}
          </span>
        </span>
      ))}
    </span>
  );

  return (
    <motion.div
      className={cn("mask-x overflow-hidden whitespace-nowrap", className)}
      style={{ skewX: reduced ? 0 : skew }}
      aria-hidden
    >
      <motion.div className="flex w-max" style={{ x }}>
        {[0, 1, 2, 3].map(row)}
      </motion.div>
    </motion.div>
  );
}
