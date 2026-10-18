import type { Root } from "hast";

export type SectionId = "brasil" | "mundo" | "economia" | "tecnologia";
export type SourceKind = "the-news" | "filipe-deschamps" | "pesquisa-propria";

export declare const SECTIONS: ReadonlyArray<{ id: SectionId; label: string }>;
export declare const SOURCE_KINDS: Readonly<Record<SourceKind, string>>;
export declare const RESERVED_IDS: readonly string[];
export declare const LIMITS: Readonly<{
  imageBytes: number;
  editionImageBytes: number;
  updateMaxDays: number;
  updateWarnDays: number;
  wordsPerMinute: number;
}>;

export interface JournalImage {
  src: string;
  alt: string;
  credit: string | null;
  width: number;
  height: number;
}

export interface JournalStory {
  id: string;
  section: SectionId;
  title: string;
  sources: Array<{ kind: SourceKind; label: string; url: string }>;
  updateOf: string | null;
  /** Resolved `update_of` target; null when the story is not an update. */
  update: { date: string; edition: number; href: string } | null;
  image: JournalImage | null;
  body: Root;
  context: Root | null;
  words: number;
  readingMinutes: number;
}

export interface JournalEdition {
  file: string;
  date: string;
  edition: number;
  title: string;
  description: string;
  highlights: string[];
  sources: Array<{ name: string; url: string }>;
  stories: JournalStory[];
  words: number;
  readingMinutes: number;
  images: string[];
}

export interface JournalIssue {
  level: "error" | "warning";
  file: string;
  field: string;
  message: string;
}

export declare function loadJournal(options: { root: string }): {
  editions: JournalEdition[];
  issues: JournalIssue[];
};
export declare function formatIssue(issue: JournalIssue): string;
export declare function isValidDate(value: unknown): boolean;
export declare function isHttpUrl(value: unknown): boolean;
export declare function sniffImage(
  buffer: Buffer,
): { format: "png" | "jpeg" | "webp" | "avif"; width: number; height: number } | null;
