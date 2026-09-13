"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

/*
 * Eases wheel scrolling on the window. Touch keeps the native momentum,
 * and reduced-motion users get the browser's default scroll.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.12,
      wheelMultiplier: 1,
      autoRaf: true,
      anchors: true,
      allowNestedScroll: true,
      stopInertiaOnNavigate: true,
    });

    /* follow the menu / command palette scroll lock */
    const root = document.documentElement;
    const syncLock = () => {
      if (root.classList.contains("home-locked")) lenis.stop();
      else lenis.start();
    };
    const observer = new MutationObserver(syncLock);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    syncLock();

    return () => {
      observer.disconnect();
      lenis.destroy();
    };
  }, []);

  return null;
}
