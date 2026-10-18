"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface Item {
  id: string;
  label: string;
  count: number;
}

/**
 * Sticky section menu: the active section (IntersectionObserver) drives a
 * sliding indicator, and the bottom hairline doubles as reading progress
 * through `progressTarget`.
 */
export default function SectionNav({ items, progressTarget }: { items: Item[]; progressTarget: string }) {
  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(items[0]?.id);

  // Active section: the first section overlapping a band below the sticky bar.
  useEffect(() => {
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting);
        const first = items.find((item) => visible.get(item.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-74px 0px -55% 0px" },
    );
    for (const item of items) {
      const section = document.getElementById(item.id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, [items]);

  // Indicator geometry follows the active link, fonts and resizes.
  useLayoutEffect(() => {
    const list = listRef.current;
    const indicator = indicatorRef.current;
    if (!list || !indicator) return;
    const place = () => {
      const link = list.querySelector<HTMLElement>(`[data-section="${active}"]`);
      if (!link) return;
      indicator.style.transform = `translateX(${link.offsetLeft}px) scaleX(${link.offsetWidth})`;
      indicator.dataset.ready = "true";
    };
    const edge = () => list.toggleAttribute("data-end", list.scrollLeft + list.clientWidth >= list.scrollWidth - 2);
    place();
    edge();
    list.addEventListener("scroll", edge, { passive: true });
    const resize = new ResizeObserver(() => {
      place();
      edge();
    });
    resize.observe(list);
    list.querySelectorAll("a").forEach((link) => resize.observe(link));

    // Keep the active link visible when the menu scrolls sideways (mobile).
    const link = list.querySelector<HTMLElement>(`[data-section="${active}"]`);
    if (link && list.scrollWidth > list.clientWidth) {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      list.scrollTo({
        left: link.offsetLeft - (list.clientWidth - link.offsetWidth) / 2,
        behavior: reduced ? "auto" : "smooth",
      });
    }
    return () => {
      resize.disconnect();
      list.removeEventListener("scroll", edge);
    };
  }, [active]);

  // Stuck state and reading progress, at most once per frame.
  useEffect(() => {
    const nav = navRef.current;
    const progress = progressRef.current;
    const target = document.getElementById(progressTarget);
    if (!nav || !progress || !target) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const top = parseFloat(getComputedStyle(nav).top) || 0;
      nav.toggleAttribute("data-stuck", nav.getBoundingClientRect().top <= top + 0.5);
      const rect = target.getBoundingClientRect();
      const reading = top + nav.offsetHeight;
      const distance = rect.height - (window.innerHeight - reading);
      const value = distance > 0 ? Math.min(1, Math.max(0, (reading - rect.top) / distance)) : 1;
      progress.style.transform = `scaleX(${value})`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [progressTarget]);

  return (
    <nav ref={navRef} className="jr-sections" aria-label="Seções da edição">
      <div className="jr-sections__inner">
        <div ref={listRef} className="jr-sections__scroller">
          <ol className="jr-sections__list">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  data-section={item.id}
                  aria-current={item.id === active ? "location" : undefined}
                  className="jr-sections__link"
                >
                  {item.label}
                  <span className="jr-sections__count" aria-hidden>
                    {item.count}
                  </span>
                  <span className="jr-sr">, {item.count === 1 ? "1 notícia" : `${item.count} notícias`}</span>
                </a>
              </li>
            ))}
          </ol>
          <span ref={indicatorRef} className="jr-sections__indicator" aria-hidden />
        </div>
      </div>
      <span className="jr-sections__progress" aria-hidden>
        <span ref={progressRef} />
      </span>
    </nav>
  );
}
