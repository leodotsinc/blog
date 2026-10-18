"use client";

import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";

import { FONT_SIZE_ATTR, FONT_SIZE_KEY, parseFontSize, type FontSize } from "@/lib/journal/font-size";

const OPTIONS: { value: FontSize; label: string; glyph: string }[] = [
  { value: "sm", label: "Diminuir fonte", glyph: "−" },
  { value: "md", label: "Tamanho padrão", glyph: "" },
  { value: "lg", label: "Aumentar fonte", glyph: "+" },
];

const CHANGE = "jr-font-size-change";
// Kept for the session when localStorage is unavailable (private mode, quota).
let session: FontSize | undefined;

function read(): FontSize {
  if (session) return session;
  try {
    return parseFontSize(localStorage.getItem(FONT_SIZE_KEY));
  } catch {
    return "md";
  }
}

function write(size: FontSize) {
  session = size;
  try {
    if (size === "md") localStorage.removeItem(FONT_SIZE_KEY);
    else localStorage.setItem(FONT_SIZE_KEY, size);
  } catch {
    // The choice still applies until the tab closes.
  }
  window.dispatchEvent(new Event(CHANGE));
}

function subscribe(notify: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== FONT_SIZE_KEY && event.key !== null) return;
    session = parseFontSize(event.newValue);
    notify();
  };
  window.addEventListener(CHANGE, notify);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE, notify);
    window.removeEventListener("storage", onStorage);
  };
}

/** A− / A / A+ next to the Journal navigation; the scale itself is CSS (--jr-fs). */
export default function FontSizeControl() {
  const size = useSyncExternalStore(subscribe, read, () => "md" as const);

  // The inline script covers full loads; this covers client navigation from the
  // blog (where it never ran) and changes, still before the browser paints.
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (size === "md") root.removeAttribute(FONT_SIZE_ATTR);
    else root.setAttribute(FONT_SIZE_ATTR, size);
  }, [size]);

  // Leave no Journal state on <html> after navigating back to the blog.
  useEffect(() => () => document.documentElement.removeAttribute(FONT_SIZE_ATTR), []);

  return (
    <div role="group" aria-label="Tamanho da fonte" className="jr-segmented jr-fontsize">
      <span className="jr-segmented__thumb" aria-hidden />
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className="jr-segmented__option jr-fontsize__option"
          data-size={option.value}
          aria-label={option.label}
          aria-pressed={option.value === size}
          title={option.label}
          onClick={() => write(option.value)}
        >
          <span aria-hidden>
            A{option.glyph ? <span className="jr-fontsize__sign">{option.glyph}</span> : null}
          </span>
        </button>
      ))}
    </div>
  );
}
