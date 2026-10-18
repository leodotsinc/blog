import type { Metadata } from "next";

import EditionView from "@/components/journal/EditionView";
import EmptyJournal from "@/components/journal/EmptyJournal";
import { getEditions, getLatestEdition, longDate } from "@/lib/journal";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  const edition = getLatestEdition();
  if (!edition) return { title: "Leo’s Journal" };
  const title = `Leo’s Journal · Edição nº ${edition.edition}`;
  return {
    title: { absolute: title },
    description: edition.description,
    // The cover mirrors the latest edition; its permanent page is canonical.
    alternates: { canonical: `/journal/${edition.date}` },
    openGraph: {
      type: "article",
      locale: "pt_BR",
      siteName: "Leo’s Journal",
      title,
      description: edition.description,
      url: `/journal/${edition.date}`,
      publishedTime: edition.date,
      images: [{ url: `/journal/${edition.date}/og`, width: 1200, height: 630, alt: `Leo’s Journal, ${longDate(edition.date)}` }],
    },
    twitter: { card: "summary_large_image", title, description: edition.description, images: [`/journal/${edition.date}/og`] },
  };
}

export default function JournalCover() {
  const editions = getEditions();
  const [latest, ...previous] = editions;
  if (!latest) return <EmptyJournal />;
  return <EditionView edition={latest} variant="cover" recent={previous.slice(0, 4)} />;
}
