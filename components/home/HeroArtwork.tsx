"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { Layers3, MoveVertical } from "lucide-react";
import styles from "./hero-artwork.module.css";

const HeroCanvas = dynamic(() => import("./HeroCanvas"), { ssr: false });

class CanvasBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/** An equally intentional illustration while loading or without WebGL. */
function BlueprintFallback({ hidden, open }: { hidden: boolean; open: boolean }) {
  return (
    <div className={styles.fallback} data-hidden={hidden} aria-hidden>
      <svg viewBox="0 0 400 400" fill="none">
        {Array.from({ length: 7 }, (_, i) => (
          <path key={i}
            d="M 74 170 L 218 88 L 332 153 L 188 236 Z M 111 170 L 218 109 L 295 153 L 188 214 Z M 74 170 V 179 L 188 245 L 332 162 V 153 M 188 236 V 245"
            transform={`translate(0 ${(i - 3) * (open ? 29 : 17)})`}
            stroke={i < 3 ? "var(--glow-2)" : "var(--glow-1)"}
            fill="var(--background)" strokeWidth="1.2" />
        ))}
      </svg>
    </div>
  );
}

export default function HeroArtwork({ theme }: { theme: "light" | "dark" }) {
  const figure = useRef<HTMLElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const [near, setNear] = useState(false);
  const [active, setActive] = useState(false);
  const [low, setLow] = useState(true);
  const [open, setOpen] = useState(false);
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
    const preload = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setNear(true); preload.disconnect(); } }, { rootMargin: "200px" });
    const menu = new MutationObserver(update);
    observer.observe(element);
    preload.observe(element);
    menu.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    document.addEventListener("visibilitychange", update);
    const media = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const quality = () => setLow(!media.matches || (navigator.hardwareConcurrency ?? 4) <= 4);
    quality();
    media.addEventListener("change", quality);
    return () => { observer.disconnect(); preload.disconnect(); menu.disconnect(); document.removeEventListener("visibilitychange", update); media.removeEventListener("change", quality); };
  }, []);

  return (
    <figure ref={figure} className={styles.figure} aria-label="Living blueprint: an interactive architectural sculpture" data-blueprint-active={active && !reduced} data-blueprint-open={open}>
      <div className={styles.aura} aria-hidden />
      <BlueprintFallback hidden={ready && !failed} open={open} />
      <div className={styles.canvas} data-ready={ready} aria-hidden
        onPointerMove={(event) => {
          if (event.pointerType !== "mouse") return;
          const bounds = event.currentTarget.getBoundingClientRect();
          pointer.current.x = ((event.clientX - bounds.left) / bounds.width - .5) * 2;
          pointer.current.y = ((event.clientY - bounds.top) / bounds.height - .5) * 2;
        }}
        onPointerLeave={() => { pointer.current.x = 0; pointer.current.y = 0; }}>
        {near && !failed && <CanvasBoundary onError={onUnavailable}>
          <HeroCanvas theme={theme} active={active} reduced={reduced} low={low} open={open} pointer={pointer} onReady={onReady} onUnavailable={onUnavailable} />
        </CanvasBoundary>}
      </div>
      <span className={styles.label}>Living blueprint / 001</span>
      <button type="button" className={styles.control} aria-pressed={open} onClick={() => setOpen((value) => !value)}>
        {open ? <Layers3 size={15} aria-hidden /> : <MoveVertical size={15} aria-hidden />}
        <span>{open ? "Bring it together" : "Unfold the architecture"}</span>
        <span className={styles.index} aria-hidden>{open ? "02 / FLOW" : "01 / FORM"}</span>
      </button>
      <figcaption className={styles.caption} aria-live="polite">{open ? "Every connection has a purpose." : "There’s more beneath the surface."}</figcaption>
    </figure>
  );
}
