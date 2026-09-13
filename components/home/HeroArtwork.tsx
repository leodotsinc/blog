"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { monogramPath } from "@/data/monogram";
import styles from "./hero-artwork.module.css";

const HeroCanvas = dynamic(() => import("./HeroCanvas"), { ssr: false });

class CanvasBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/** The original vector mark stays visible until the metal has compiled. */
function MonogramFallback({ hidden }: { hidden: boolean }) {
  const gradientId = useId();
  return (
    <div className={styles.fallback} data-hidden={hidden} aria-hidden>
      <svg viewBox="0 0 1024 1024" fill="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--foreground)" stopOpacity=".7" />
            <stop offset=".45" stopColor="var(--glow-2)" stopOpacity=".6" />
            <stop offset="1" stopColor="var(--glow-1)" stopOpacity=".5" />
          </linearGradient>
        </defs>
        <g transform="matrix(0.12173, 0, 0, -0.12173, -141.081543, 1139.412231)" fill={`url(#${gradientId})`}>
          <path d={monogramPath} />
        </g>
      </svg>
    </div>
  );
}

export default function HeroArtwork({ theme }: { theme: "light" | "dark" }) {
  const figure = useRef<HTMLElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const [started, setStarted] = useState(false);
  const [active, setActive] = useState(false);
  const [low, setLow] = useState(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const reduced = Boolean(useReducedMotion());
  const onReady = useCallback(() => setReady(true), []);
  const onUnavailable = useCallback(() => { setFailed(true); setReady(false); }, []);

  useEffect(() => {
    const element = figure.current;
    if (!element) return;
    let visible = false;
    const update = () => setActive(visible && document.visibilityState === "visible" && !document.documentElement.classList.contains("home-locked"));
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, { threshold: 0 });
    const menu = new MutationObserver(update);
    observer.observe(element);
    menu.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    document.addEventListener("visibilitychange", update);
    const media = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const quality = () => setLow(!media.matches || (navigator.hardwareConcurrency ?? 4) <= 4);
    quality();
    media.addEventListener("change", quality);
    return () => { observer.disconnect(); menu.disconnect(); document.removeEventListener("visibilitychange", update); media.removeEventListener("change", quality); };
  }, []);

  useEffect(() => {
    if (!active || started) return;
    // Give the first layout and navigation priority over creating the reflection map.
    // Once started, keep the scene mounted so reopening the menu never recompiles it.
    if ("requestIdleCallback" in window) {
      const idle = window.requestIdleCallback(() => setStarted(true), { timeout: 1500 });
      return () => window.cancelIdleCallback(idle);
    }
    const timer = setTimeout(() => setStarted(true), 120);
    return () => clearTimeout(timer);
  }, [active, started]);

  return (
    <figure ref={figure} className={styles.figure} aria-label="Leonardo Torres monogram, a kinetic metal sculpture" data-sculpture-active={active && !reduced}>
      <div className={styles.aura} aria-hidden />
      <div className={styles.shadow} aria-hidden />
      <MonogramFallback hidden={ready && !failed} />
      <div className={styles.canvas} data-ready={ready} aria-hidden
        onPointerMove={(event) => {
          if (event.pointerType !== "mouse") return;
          const bounds = event.currentTarget.getBoundingClientRect();
          pointer.current.x = ((event.clientX - bounds.left) / bounds.width - .5) * 2;
          pointer.current.y = ((event.clientY - bounds.top) / bounds.height - .5) * 2;
        }}
        onPointerLeave={() => { pointer.current.x = 0; pointer.current.y = 0; }}>
        {started && !failed && <CanvasBoundary onError={onUnavailable}>
          <HeroCanvas theme={theme} active={active} reduced={reduced} low={low} pointer={pointer} onReady={onReady} onUnavailable={onUnavailable} />
        </CanvasBoundary>}
      </div>
      <figcaption className="sr-only">The pieces of Leonardo’s monogram slowly separate, turn and reunite.</figcaption>
    </figure>
  );
}
