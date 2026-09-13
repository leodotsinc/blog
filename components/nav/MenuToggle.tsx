"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Two bars that cross into an X. The bars morph rather than cross-fade, so the
 * open and closed states read as the same object.
 */
export default function MenuToggle({
  open,
  onClick,
  className,
}: {
  open: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      aria-controls="site-menu"
      className={cn(
        "group relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-foreground/8",
        className
      )}
    >
      <span className="relative block h-4 w-5">
        <motion.span
          className="absolute left-0 block h-[1.5px] w-full rounded-full bg-current"
          animate={
            open
              ? { top: "50%", rotate: 45, y: "-50%", width: "100%" }
              : { top: "25%", rotate: 0, y: "0%", width: "100%" }
          }
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.span
          className="absolute left-0 block h-[1.5px] rounded-full bg-current"
          animate={
            open
              ? { top: "50%", rotate: -45, y: "-50%", width: "100%" }
              : { top: "75%", rotate: 0, y: "0%", width: "65%" }
          }
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
        />
      </span>
    </button>
  );
}
