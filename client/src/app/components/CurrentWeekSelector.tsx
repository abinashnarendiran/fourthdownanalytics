"use client";

import { useEffect, useState } from "react";

export interface CurrentWeekSelectorProps {
  currentWeek?: number;
  label?: string;
  className?: string;
  selectClassName?: string;
  onSelect?: (week: number) => void;
  disabled?: boolean;

  // Optional overrides
  startWeek?: number; // default 1
  endWeek?: number;   // default 18
}

export default function CurrentWeekSelector({
  currentWeek,
  label = "Select Week",
  className = "",
  selectClassName = "",
  onSelect,
  disabled = false,
  startWeek = 1,
  endWeek = 18
}: CurrentWeekSelectorProps) {
  const [weeks, setWeeks] = useState<number[]>([]);

  useEffect(() => {
    const generatedWeeks = Array.from(
      { length: endWeek - startWeek + 1 },
      (_, i) => startWeek + i
    );
    setWeeks(generatedWeeks);
  }, [startWeek, endWeek]);

  return (
    <div className={`w-full max-w-xs ${className}`}>
      <label
        htmlFor="current-week"
        className="mb-1 block text-sm font-medium text-foreground"
      >
        {label}
      </label>

      <div className="relative">
        <select
          id="current-week"
          disabled={disabled}
          value={currentWeek ?? ""}
          onChange={(e) => onSelect?.(Number(e.target.value))}
          className={`w-full appearance-none rounded-md border
            px-3 py-2 text-sm
            bg-background text-foreground
            border-border
            focus:border-accent focus:ring-2 focus:ring-accent/30
            hover:border-accent
            transition
            disabled:opacity-60 disabled:cursor-not-allowed
            outline-none
            ${selectClassName}`}
        >
          <option value="" disabled>
            Select week
          </option>

          {weeks.map((week) => (
            <option key={week} value={week}>
              Week {week}
            </option>
          ))}
        </select>

        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60">
          ▼
        </span>
      </div>
    </div>
  );
}
