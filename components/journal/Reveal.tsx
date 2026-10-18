"use client";

import { useLayoutEffect } from "react";

/**
 * Fades `[data-reveal]` blocks in as they enter the viewport. Blocks already
 * on screen are marked before paint, so nothing visible ever blinks; without
 * JS or with reduced motion everything is simply shown.
 */
export default function Reveal() {
  useLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>(".jr-root");
    if (!root || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px" },
    );
    for (const element of root.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)")) {
      if (element.getBoundingClientRect().top < window.innerHeight) element.classList.add("is-in");
      else observer.observe(element);
    }
    root.classList.add("jr-reveal");
    return () => observer.disconnect();
  }, []);

  return null;
}
