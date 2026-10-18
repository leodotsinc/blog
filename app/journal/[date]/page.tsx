import type { Metadata } from "next";
import { notFound } from "next/navigation";

import EditionView from "@/components/journal/EditionView";
import { getEdition, getEditions, getNeighbours, longDate } from "@/lib/journal";

interface PageProps {
  params: Promise<{ date: string }>;
}

export const dynamic = "force-static";
// Unknown dates render the journal's own not-found boundary, not the global 404.
export const dynamicParams = true;

export function generateStaticParams() {
  return getEditions().map((edition) => ({ date: edition.date }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { date } = await params;
  const edition = getEdition(date);
  if (!edition) return { title: "Edição não encontrada" };
  const title = `Edição nº ${edition.edition}, ${longDate(edition.date)}`;
  return {
    title: { absolute: `${title} · Leo’s Journal` },
    description: edition.description,
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

export default async function EditionPage({ params }: PageProps) {
  const { date } = await params;
  const edition = getEdition(date);
  if (!edition) notFound();
  const { newer, older } = getNeighbours(date);
  return <EditionView edition={edition} variant="edition" newer={newer} older={older} />;
}
