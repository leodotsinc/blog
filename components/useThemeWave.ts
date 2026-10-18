"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";

/**
 * Shared light/dark toggle (blog header and Journal bar): next-themes storage,
 * and the circular wave from the button's measured center via View Transitions.
 * The button (or its glyph wrapper) carries `.theme-toggle` for its own transition name.
 */
export function useThemeWave() {
  const [mounted, setMounted] = useState(false);
  const changing = useRef(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  async function toggleTheme(event: MouseEvent<HTMLButtonElement>) {
    if (changing.current) return;
    const button = event.currentTarget;
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduced) {
      setTheme(nextTheme);
      return;
    }

    // Pointer position (and keyboard clicks at 0,0) is not the icon's center.
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    changing.current = true;
    document.documentElement.classList.add("theme-changing");
    try {
      const transition = document.startViewTransition(() => {
        // Capture the new theme AND the new glyph in the same DOM update.
        flushSync(() => setTheme(nextTheme));
      });
      await transition.ready;
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 550, easing: "cubic-bezier(.22,1,.36,1)", pseudoElement: "::view-transition-new(root)" },
      );
      document.documentElement.animate(
        { transform: ["rotate(-70deg) scale(.8)", "rotate(0deg) scale(1)"] },
        { duration: 450, easing: "cubic-bezier(.22,1,.36,1)", pseudoElement: "::view-transition-new(theme-toggle)" },
      );
      await transition.finished;
    } catch {
      // Browsers can skip snapshots (hidden tab, resize). Keep the toggle usable.
      setTheme(nextTheme);
    } finally {
      changing.current = false;
      document.documentElement.classList.remove("theme-changing");
    }
  }

  return { mounted, dark: resolvedTheme === "dark", toggleTheme };
}
