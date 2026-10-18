import { journalOg } from "@/app/journal/_og/render";
import { capitalize, getEdition, getEditions, longDate } from "@/lib/journal";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return getEditions().map((edition) => ({ date: edition.date }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const edition = getEdition(date);
  if (!edition) return new Response("Not found", { status: 404 });
  const titles = edition.highlights.map((id) => edition.stories.find((story) => story.id === id)?.title ?? "");
  return journalOg({
    strip: [`Edição nº ${edition.edition}`, capitalize(longDate(edition.date)), "leodots.com"],
    headline: titles[0],
    secondary: titles.slice(1),
  });
}
