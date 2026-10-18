"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeWave } from "@/components/useThemeWave";

export default function ThemeSwitcher() {
  const { mounted, dark, toggleTheme } = useThemeWave();

  return (
    <Button id="theme-btn" type="button" variant="ghost" size="icon"
      aria-label={mounted && dark ? "Switch to light theme" : "Switch to dark theme"}
      disabled={!mounted} className="theme-toggle size-11 rounded-full p-3" onClick={toggleTheme}>
      {mounted ? (dark ? <Sun aria-hidden /> : <Moon aria-hidden />) : <span className="size-5" />}
    </Button>
  );
}
