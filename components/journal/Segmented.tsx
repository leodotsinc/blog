"use client";

import { useState, type ReactNode } from "react";

interface Option<T extends string> {
  value: T;
  label: string;
}

/** Two-or-more option toggle with a sliding indicator (equal-width cells). */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  return (
    <div
      role="group"
      aria-label={label}
      className="jr-segmented"
      style={{ "--jr-seg-count": options.length, "--jr-seg-index": index } as React.CSSProperties}
    >
      <span className="jr-segmented__thumb" aria-hidden />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="jr-segmented__option"
          aria-pressed={option.value === value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Full text or headlines only, applied to the edition by a data attribute. */
export function ReadingMode({ target }: { target: string }) {
  const [mode, setMode] = useState<"full" | "headlines">("full");
  return (
    <Segmented
      label="Modo de leitura"
      value={mode}
      options={[
        { value: "full", label: "Completo" },
        { value: "headlines", label: "Manchetes" },
      ]}
      onChange={(next) => {
        setMode(next);
        document.getElementById(target)?.setAttribute("data-reading", next);
      }}
    />
  );
}

/** Archive list / calendar views, both rendered on the server. */
export function ArchiveViews({ list, calendar }: { list: ReactNode; calendar: ReactNode }) {
  const [view, setView] = useState<"list" | "calendar">("list");
  return (
    <>
      <div className="jr-archive__toolbar">
        <Segmented
          label="Visualização do arquivo"
          value={view}
          options={[
            { value: "list", label: "Lista" },
            { value: "calendar", label: "Calendário" },
          ]}
          onChange={setView}
        />
      </div>
      <div className="jr-archive__view" hidden={view !== "list"}>
        {list}
      </div>
      <div className="jr-archive__view" hidden={view !== "calendar"}>
        {calendar}
      </div>
    </>
  );
}
