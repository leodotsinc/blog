import type { Metadata } from "next";

import { ArchiveCalendar, ArchiveList, groupByMonth } from "@/components/journal/Archive";
import { Nameplate, Rule } from "@/components/journal/Masthead";
import EmptyJournal from "@/components/journal/EmptyJournal";
import Reveal from "@/components/journal/Reveal";
import { ArchiveViews } from "@/components/journal/Segmented";
import { getEditions, longDate } from "@/lib/journal";

export const dynamic = "force-static";

const description = "Todas as edições do Leo’s Journal, por mês e em calendário.";

export const metadata: Metadata = {
  title: { absolute: "Arquivo · Leo’s Journal" },
  description,
  alternates: { canonical: "/journal/arquivo" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Leo’s Journal",
    title: "Arquivo · Leo’s Journal",
    description,
    url: "/journal/arquivo",
    images: [{ url: "/journal/og", width: 1200, height: 630, alt: "Leo’s Journal" }],
  },
  twitter: { card: "summary_large_image", title: "Arquivo · Leo’s Journal", description, images: ["/journal/og"] },
};

export default function ArchivePage() {
  const editions = getEditions();
  if (!editions.length) return <EmptyJournal />;
  const months = groupByMonth(editions);
  const first = editions.at(-1);
  return (
    <div className="jr-shell jr-archive">
      <header className="jr-masthead jr-masthead--archive">
        <div className="jr-strip jr-enter jr-enter--1">
          <span>Arquivo</span>
          <span>
            {editions.length} {editions.length === 1 ? "edição" : "edições"}
          </span>
          <span>{first ? `Desde ${longDate(first.date).replace(/^[^,]+, /, "")}` : "Em breve"}</span>
        </div>
        <div className="jr-flag">
          <Nameplate link />
        </div>
        <Rule />
      </header>
      <div className="jr-page">
        <div className="jr-archive__intro jr-enter jr-enter--4">
          <h1 className="jr-archive__title">Arquivo</h1>
          <p className="jr-archive__lede">
            {first
              ? `${editions.length === 1 ? "Uma edição publicada" : `${editions.length} edições publicadas`} em dias úteis. Navegue pela lista ou pelo calendário.`
              : "Ainda não há edições publicadas."}
          </p>
        </div>
        <ArchiveViews list={<ArchiveList months={months} />} calendar={<ArchiveCalendar months={months} />} />
      </div>
      <Reveal />
    </div>
  );
}
