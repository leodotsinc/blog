import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, Newsreader, Playfair_Display, UnifrakturMaguntia } from "next/font/google";

import { JournalTransitions } from "@/components/journal/JournalTransitions";
import JournalPWA from "@/components/journal/JournalPWA";
import JournalBar from "@/components/journal/JournalBar";
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
  applicationName: "Journal",
  manifest: "/journal/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Journal", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/journal-app/favicon.svg", type: "image/svg+xml" },
      { url: "/journal-app/favicon-32.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: "/journal-app/favicon-32.png",
    apple: [{ url: "/journal-app/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  alternates: {
    types: { "application/rss+xml": [{ url: "/journal/rss.xml", title: "Leo’s Journal" }] },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f3f2" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
};

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      lang="pt-BR"
      className={`jr-root ${nameplate.variable} ${display.variable} ${text.variable} ${mono.variable}`}
    >
      <JournalPWA />
      <JournalBar />
      <JournalTransitions>{children}</JournalTransitions>
      <nav className="jr-shell jr-app-nav" aria-label="Navegação do Journal">
        <Link href="/journal" prefetch={false}>Capa</Link>
        <Link href="/journal/arquivo" prefetch={false}>Arquivo</Link>
        <a href="/journal/rss.xml">RSS</a>
      </nav>
    </main>
  );
}
