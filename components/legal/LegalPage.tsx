import type { ReactNode } from "react";

import SectionContainer from "@/components/SectionContainer";
import { legal } from "@/data/legal";

interface LegalPageProps {
  titlePt: string;
  summaryTitle: string;
  summary: ReactNode;
  children: ReactNode;
}

export default function LegalPage({
  titlePt,
  summaryTitle,
  summary,
  children,
}: LegalPageProps) {
  return (
    <SectionContainer size="sm">
      <article className="py-8">
        <header className="mb-8">
          <h1 className="text-3xl sm:text-5xl font-bold mb-4" lang="pt-BR">
            {titlePt}
          </h1>
          <p className="text-sm text-muted-foreground">
            <span lang="pt-BR">Última atualização: </span>
            <time dateTime={legal.lastUpdated} lang="pt-BR">
              {legal.lastUpdatedPt}
            </time>
            <span lang="en"> · Last updated: {legal.lastUpdatedEn}</span>
          </p>
        </header>

        <aside
          lang="en"
          className="mb-10 rounded-lg border border-border bg-muted/40 p-5"
        >
          <h2 className="text-lg font-semibold mb-2 text-foreground">
            {summaryTitle}
          </h2>
          <div className="prose max-w-none text-muted-foreground [&_p]:mb-2 [&_p:last-child]:mb-0 [&_code]:break-all [&_a]:[overflow-wrap:anywhere] [&_strong]:text-foreground">
            {summary}
          </div>
        </aside>

        <div lang="pt-BR" className="prose max-w-none [&_code]:break-all [&_a]:[overflow-wrap:anywhere] [&_strong]:text-foreground">
          {children}
        </div>
      </article>
    </SectionContainer>
  );
}
