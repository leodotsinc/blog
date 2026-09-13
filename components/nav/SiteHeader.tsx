"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Search } from "lucide-react";

import ThemeSwitcher from "@/components/ThemeSwitcher";
import { headerNavLinks } from "@/data/navLinks";
import { cn } from "@/lib/utils";
import CommandPalette, { type CommandItem } from "./CommandPalette";
import MenuOverlay from "./MenuOverlay";
import MenuToggle from "./MenuToggle";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function SiteHeader({ commands }: { commands: CommandItem[] }) {
  const pathname = usePathname() || "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const [hovered, setHovered] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);

  const { scrollY } = useScroll();

  /* the bar stays put at every scroll position — it only shrinks into a
     discreet pod so it stops competing with the page */
  useMotionValueEvent(scrollY, "change", (latest) => {
    setCompact(latest > 24);
  });

  const links = headerNavLinks.filter((link) => !link.hidden);

  const isActive = useCallback(
    (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href)),
    [pathname]
  );

  /* close everything when the route changes */
  useEffect(() => {
    setMenuOpen(false);
    setPaletteOpen(false);
  }, [pathname]);

  /* cmd/ctrl + k opens search anywhere */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setMenuOpen(false);
        setPaletteOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const activeLabel =
    links.find((link) => isActive(link.href))?.title ?? "Leo";

  return (
    <div className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
      <motion.header
        initial={false}
        /* lifted above the overlay while it is open so the toggle stays
           reachable and can morph into the close button */
        style={{ zIndex: menuOpen ? 62 : 1 }}
        className="relative mx-auto w-full max-w-[1168px]"
      >
        <motion.div
          initial={false}
          animate={{
            width: compact ? 208 : "100%",
            paddingLeft: compact ? 8 : 18,
            paddingRight: compact ? 8 : 18,
          }}
          transition={{ duration: 0.55, ease: EASE }}
          /* Animate the actual width inside a capped parent. A 1168px
             max-width target finishes visibly too early on narrow screens.
             Containment keeps width/padding layout work inside the header. */
          style={{ contain: "layout style" }}
          className={cn(
            "mx-auto flex h-14 items-center justify-between rounded-full border transition-colors duration-500",
            compact || menuOpen
              ? "border-border/70 bg-background/70 shadow-lg shadow-black/5 backdrop-blur-xl"
              : "border-border/50 bg-card/50 backdrop-blur-md"
          )}
        >
          {/* logo */}
          <Link
            href="/"
            aria-label="Home"
            className="group relative flex shrink-0 items-center gap-2.5 rounded-full pl-1 pr-2"
          >
            <span className="relative flex h-9 w-9 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-glow-2/40 via-glow-1/30 to-glow-3/40 opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-100" />
              <Image
                src="/logo.svg"
                alt=""
                width={34}
                height={34}
                priority
                className="relative transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-105"
              />
            </span>
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground md:hidden">
              {activeLabel}
            </span>
          </Link>

          {/* inline nav — collapses to zero width in the compact pod */}
          <motion.nav
            initial={false}
            animate={{ maxWidth: compact ? 0 : 520, opacity: compact ? 0 : 1 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="hidden items-center overflow-hidden md:flex"
            onMouseLeave={() => setHovered(null)}
            aria-label="Primary"
          >
            {links.map((link) => {
              const highlighted =
                hovered === null ? isActive(link.href) : hovered === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onMouseEnter={() => setHovered(link.href)}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={cn(
                    "relative rounded-full px-4 py-2 text-sm transition-colors duration-300",
                    isActive(link.href)
                      ? "text-foreground"
                      : "text-foreground/60 hover:text-foreground"
                  )}
                >
                  {highlighted && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute inset-0 -z-10 rounded-full bg-foreground/8"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  {link.title}
                </Link>
              );
            })}
          </motion.nav>

          {/* actions */}
          <div className="flex shrink-0 items-center gap-1">
            <motion.button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search"
              initial={false}
              animate={{ maxWidth: compact ? 0 : 150, opacity: compact ? 0 : 1 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="hidden items-center gap-2 overflow-hidden rounded-full border border-border/60 py-1.5 pl-3 pr-2 text-muted-foreground transition-colors hover:border-glow-1/50 hover:text-foreground lg:flex"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="text-xs">Search</span>
              <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px]">
                ⌘K
              </kbd>
            </motion.button>

            <ThemeSwitcher />

            <MenuToggle
              open={menuOpen}
              onClick={() => {
                setPaletteOpen(false);
                setMenuOpen((value) => !value);
              }}
              className="relative z-[61]"
            />
          </div>
        </motion.div>
      </motion.header>

      <MenuOverlay
        open={menuOpen}
        onClose={closeMenu}
        activeHref={pathname}
      />

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        items={commands}
      />
    </div>
  );
}
