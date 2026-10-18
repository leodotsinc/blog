import { formatIssue, loadJournal, SECTIONS, type JournalEdition, type JournalStory, type SectionId } from "./core.mjs";

export type { JournalEdition, JournalStory, SectionId } from "./core.mjs";
export { SECTIONS, SOURCE_KINDS } from "./core.mjs";

let cache: JournalEdition[] | undefined;

/** Every edition, newest first. Fails the build loudly on any invalid file. */
export function getEditions(): JournalEdition[] {
  if (cache && process.env.NODE_ENV === "production") return cache;
  const { editions, issues } = loadJournal({ root: process.cwd() });
  const errors = issues.filter((issue) => issue.level === "error");
  if (errors.length) {
    throw new Error(`Leo's Journal has invalid editions:\n${errors.map(formatIssue).join("\n")}`);
  }
  cache = editions.slice().reverse();
  return cache;
}

export function getLatestEdition(): JournalEdition | undefined {
  return getEditions()[0];
}

export function getEdition(date: string): JournalEdition | undefined {
  return getEditions().find((edition) => edition.date === date);
}

export function getNeighbours(date: string) {
  const editions = getEditions();
  const index = editions.findIndex((edition) => edition.date === date);
  return { newer: index > 0 ? editions[index - 1] : undefined, older: index >= 0 ? editions[index + 1] : undefined };
}

export interface EditionLayout {
  highlights: JournalStory[];
  sections: Array<{
    id: SectionId;
    label: string;
    stories: JournalStory[];
    /** Highlights that belong to this section, cross-referenced from it. */
    featured: JournalStory[];
  }>;
}

/** Destaques first; each remaining story appears once, inside its section. */
export function layoutEdition(edition: JournalEdition): EditionLayout {
  const byId = new Map(edition.stories.map((story) => [story.id, story]));
  const highlights = edition.highlights.map((id) => byId.get(id)).filter((s): s is JournalStory => Boolean(s));
  const featured = new Set(edition.highlights);
  return {
    highlights,
    sections: SECTIONS.map((section) => ({
      ...section,
      stories: edition.stories.filter((story) => story.section === section.id && !featured.has(story.id)),
      featured: highlights.filter((story) => story.section === section.id),
    })),
  };
}

// Dates are calendar days (America/Sao_Paulo). Formatting them as UTC
// midnight keeps server and browser output identical.
function utc(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function format(date: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: "UTC" }).format(utc(date));
}

/** "sexta-feira, 16 de outubro de 2026" */
export const longDate = (date: string) => format(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
/** "16 de outubro" */
export const dayMonth = (date: string) => format(date, { day: "numeric", month: "long" });
/** "16 out." */
export const shortDate = (date: string) => format(date, { day: "numeric", month: "short" });
/** "sex." */
export const shortWeekday = (date: string) => format(date, { weekday: "short" });
/** "outubro de 2026" */
export const monthLabel = (date: string) => format(date, { month: "long", year: "numeric" });

export const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** Weekday index with Monday = 0. */
export const weekdayIndex = (date: string) => (utc(date).getUTCDay() + 6) % 7;

/** Editions are published in the morning in São Paulo (UTC-3, no DST). */
export const publishedAt = (date: string) => new Date(utc(date).getTime() + 10 * 3_600_000);

export const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
