import { capitalize, getEditions, longDate, publishedAt } from "@/lib/journal";

export const dynamic = "force-static";

const SITE = "https://leodots.com";

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function GET() {
  const editions = getEditions();
  const items = editions.map((edition) => {
    const url = `${SITE}/journal/${edition.date}`;
    const highlights = edition.highlights
      .map((id) => edition.stories.find((story) => story.id === id))
      .filter((story) => story !== undefined)
      .map((story) => `<li><a href="${url}#${story.id}">${escape(story.title)}</a></li>`)
      .join("");
    const html = `<p>${escape(edition.description)}</p><p>Destaques:</p><ul>${highlights}</ul>`;
    return [
      "<item>",
      `<title>${escape(`Edição nº ${edition.edition} · ${capitalize(longDate(edition.date))}`)}</title>`,
      `<link>${url}</link>`,
      `<guid isPermaLink="true">${url}</guid>`,
      `<pubDate>${publishedAt(edition.date).toUTCString()}</pubDate>`,
      `<description>${escape(html)}</description>`,
      "</item>",
    ].join("");
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "<channel>",
    "<title>Leo’s Journal</title>",
    `<link>${SITE}/journal</link>`,
    `<atom:link href="${SITE}/journal/rss.xml" rel="self" type="application/rss+xml"/>`,
    "<description>O essencial das newsletters do dia: Brasil, Mundo, Economia e Tecnologia.</description>",
    "<language>pt-BR</language>",
    editions[0] ? `<lastBuildDate>${publishedAt(editions[0].date).toUTCString()}</lastBuildDate>` : "",
    ...items,
    "</channel>",
    "</rss>",
  ].join("\n");

  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
