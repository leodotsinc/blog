"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import FontSizeControl from "@/components/journal/FontSizeControl";

/** Always present above the masthead, including empty editions and journal 404s. */
export default function JournalBar() {
  const pathname = usePathname();
  const archive = pathname === "/journal/arquivo";
  return (
    <nav className="jr-shell" aria-label="Navegação principal do Journal">
      <div className="jr-bar">
        <Link href="/journal" prefetch={false} aria-current={pathname === "/journal" ? "page" : undefined}>
          {archive ? <span aria-hidden="true">← </span> : null}Edição mais recente
        </Link>
        <div className="jr-bar__end">
          <Link href="/journal/arquivo" prefetch={false} aria-current={archive ? "page" : undefined}>
            Arquivo
          </Link>
          <FontSizeControl />
        </div>
      </div>
    </nav>
  );
}
