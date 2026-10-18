"use client";

import { Moon, Sun } from "lucide-react";

import { useThemeWave } from "@/components/useThemeWave";

/**
 * The blog's theme toggle (same next-themes key and wave), in Journal dress.
 * Both glyphs are rendered and `html.dark` picks one, so the icon is right
 * before hydration. Only the glyph carries `.theme-toggle`, so the wave rotates
 * the icon in while the bordered box is revealed with the page.
 */
export default function JournalThemeToggle() {
  const { mounted, dark, toggleTheme } = useThemeWave();
  const label = mounted ? (dark ? "Alternar para o tema claro" : "Alternar para o tema escuro") : "Alternar tema claro/escuro";
  return (
    <button type="button" className="jr-theme" aria-label={label} title={label} onClick={toggleTheme}>
      <span className="jr-theme__glyph theme-toggle" aria-hidden>
        <Moon className="jr-theme__icon jr-theme__icon--light" />
        <Sun className="jr-theme__icon jr-theme__icon--dark" />
      </span>
    </button>
  );
}
