"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function JournalPWA() {
  const pathname = usePathname();
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/journal/sw.js", {
      scope: "/journal",
      updateViaCache: "none",
    }).catch((error: unknown) => {
      console.warn("Journal: não foi possível habilitar a leitura offline.", error);
    });
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let cancelled = false;
    // Next's client navigation fetches RSC, not HTML. Warm a separate document
    // for offline reloads without ever mixing these two response formats.
    void navigator.serviceWorker.ready.then((registration) => {
      if (!cancelled) registration.active?.postMessage({ type: "CACHE_PAGE", path: window.location.pathname });
    });
    return () => { cancelled = true; };
  }, [pathname]);

  return null;
}
