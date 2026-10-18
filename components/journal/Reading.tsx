"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";

export type Reading = "full" | "headlines";

interface ReadingState {
  mode: Reading;
  setMode: (mode: Reading) => void;
  open: ReadonlySet<string>;
  toggle: (id: string, headline: HTMLElement) => void;
}

const ReadingContext = createContext<ReadingState | null>(null);

export const useReading = () => useContext(ReadingContext);

const HINT_ID = "jr-headline-hint";

// The story an in-page `#id` points at, if it is one.
function storyFor(hash: string, target: string) {
  if (hash.length < 2) return null;
  let id: string;
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    return null;
  }
  const story = document.getElementById(id);
  return story?.matches(".jr-story") && story.closest(`#${target}`) ? id : null;
}

/**
 * Reading mode for one edition (`data-reading` on `target`) and, in
 * "headlines", which stories are expanded in place. Entering that mode starts
 * collapsed except the story named by the URL hash; in-page links to a story
 * open it while the browser keeps its usual jump.
 */
export function ReadingProvider({ target, children }: { target: string; children: React.ReactNode }) {
  const [mode, setModeState] = useState<Reading>("full");
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());

  const setMode = useCallback(
    (next: Reading) => {
      setModeState(next);
      if (next === "headlines") {
        const id = storyFor(window.location.hash, target);
        setOpen(new Set(id ? [id] : []));
      }
    },
    [target],
  );

  const expand = useCallback((id: string) => {
    setOpen((current) => (current.has(id) ? current : new Set(current).add(id)));
  }, []);

  const toggle = useCallback((id: string, headline: HTMLElement) => {
    setOpen((current) => {
      const next = new Set(current);
      if (next.delete(id)) return next;
      return next.add(id);
    });
    // Closing a story whose headline sits under the sticky bar (or above the
    // viewport) would leave the reader further down the page: bring the
    // headline back to its anchor first, so only what is below it moves.
    if (headline.getAttribute("aria-expanded") === "true") {
      const bar = document.querySelector(".jr-sections")?.getBoundingClientRect().bottom ?? 0;
      if (headline.getBoundingClientRect().top < bar) {
        document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "instant" });
      }
    }
  }, []);

  useLayoutEffect(() => {
    document.getElementById(target)?.setAttribute("data-reading", mode);
  }, [mode, target]);

  useEffect(() => {
    if (mode !== "headlines") return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || !(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>('a[href^="#"]');
      const id = link && storyFor(link.hash, target);
      if (id) expand(id);
    };
    const onHash = () => {
      const id = storyFor(window.location.hash, target);
      if (id) expand(id);
    };
    document.addEventListener("click", onClick);
    window.addEventListener("hashchange", onHash);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("hashchange", onHash);
    };
  }, [mode, target, expand]);

  const value = useMemo(() => ({ mode, setMode, open, toggle }), [mode, setMode, open, toggle]);
  return (
    <ReadingContext.Provider value={value}>
      {children}
      {mode === "headlines" && (
        <span id={HINT_ID} hidden>
          Abre ou fecha a notícia aqui mesmo.
        </span>
      )}
    </ReadingContext.Provider>
  );
}

/**
 * A story headline. In "full" mode it is the plain heading the server
 * rendered; in "headlines" it becomes a disclosure button for the story's
 * content (`contentId`), with a +/− marker glued to the last word.
 */
export function StoryHeadline({
  storyId,
  titleId,
  contentId,
  title,
}: {
  storyId: string;
  titleId: string;
  contentId: string;
  title: string;
}) {
  const reading = useReading();
  if (reading?.mode !== "headlines") {
    return (
      <h3 id={titleId} className="jr-headline">
        {title}
      </h3>
    );
  }
  const expanded = reading.open.has(storyId);
  const cut = title.lastIndexOf(" ") + 1;
  return (
    <h3 id={titleId} className="jr-headline">
      <button
        type="button"
        className="jr-headline__toggle"
        aria-expanded={expanded}
        aria-controls={contentId}
        aria-describedby={HINT_ID}
        onClick={(event) => reading.toggle(storyId, event.currentTarget)}
      >
        {title.slice(0, cut)}
        <span className="jr-headline__end">
          {title.slice(cut)}
          <span className="jr-headline__marker" aria-hidden />
        </span>
      </button>
    </h3>
  );
}
