import type { Metadata } from "next";
import { IBM_Plex_Mono, Newsreader, Playfair_Display, UnifrakturMaguntia } from "next/font/google";

import { JournalTransitions } from "@/components/journal/JournalTransitions";
import "./journal.css";

// Loaded only on journal routes; every rule in journal.css is scoped to .jr-root.
const nameplate = UnifrakturMaguntia({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--jr-font-nameplate",
});
const display = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--jr-font-display",
});
const text = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
  variable: "--jr-font-text",
});
const mono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--jr-font-mono",
});

export const metadata: Metadata = {
  alternates: {
    types: { "application/rss+xml": [{ url: "/journal/rss.xml", title: "Leo’s Journal" }] },
  },
};

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      lang="pt-BR"
      className={`jr-root ${nameplate.variable} ${display.variable} ${text.variable} ${mono.variable}`}
    >
      <JournalTransitions>{children}</JournalTransitions>
    </div>
  );
}
