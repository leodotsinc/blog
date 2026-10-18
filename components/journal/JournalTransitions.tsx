"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, type ComponentProps } from "react";

type Navigate = (href: string) => boolean;

const NavigateContext = createContext<Navigate | null>(null);

/**
 * View Transitions for navigations *between journal pages only*. The rest of
 * the site keeps Next's default navigation; `jr-vt` on <html> scopes every
 * transition name and keyframe to this window, so the theme wave is untouched.
 */
export function JournalTransitions({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const settle = useRef<(() => void) | null>(null);

  // The new route has committed: let the browser capture the new snapshot.
  useEffect(() => {
    settle.current?.();
    settle.current = null;
  }, [pathname]);

  const navigate = useCallback<Navigate>(
    (href) => {
      const root = document.documentElement;
      const target = new URL(href, window.location.href);
      if (
        target.origin !== window.location.origin ||
        target.pathname === window.location.pathname ||
        !document.startViewTransition ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        root.classList.contains("theme-changing") ||
        root.classList.contains("jr-vt")
      ) {
        return false;
      }
      root.classList.add("jr-vt");
      const transition = document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            settle.current = resolve;
            // Never hold the page frozen on a slow route.
            window.setTimeout(resolve, 1200);
            router.push(target.pathname + target.search + target.hash);
          }),
      );
      transition.ready.catch(() => {});
      transition.finished.finally(() => root.classList.remove("jr-vt"));
      return true;
    },
    [router],
  );

  return <NavigateContext.Provider value={navigate}>{children}</NavigateContext.Provider>;
}

type JournalLinkProps = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/** next/link that animates journal-to-journal navigations. */
export function JournalLink({ href, onClick, ...props }: JournalLinkProps) {
  const navigate = useContext(NavigateContext);
  return (
    <Link
      href={href}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          props.target
        ) {
          return;
        }
        if (navigate?.(href)) event.preventDefault();
      }}
    />
  );
}
