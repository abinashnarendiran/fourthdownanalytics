"use client"; // for hooks in Next.js app directory
import { useState } from "react";

interface LeagueSelectorProps {
  leagues: string[];
  onSelect: (league: string) => void;
}

export default function LeagueSelector({
  leagues,
  onSelect
}: LeagueSelectorProps) {
  const [selectedLeague, setSelectedLeague] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedLeague(value);
    onSelect(value);
  };

  return (
    <div className="w-full max-w-xs mx-auto">
      <label
        htmlFor="league"
        className="block mb-1 text-sm font-medium"
        style={{ color: "var(--foreground)" }}
      >
        Select League
      </label>

      <select
        id="league"
        value={selectedLeague}
        onChange={handleChange}
        className="
          block w-full rounded-md border px-3 py-2 text-sm
          border-primary
          bg-background
          text-foreground
          focus:border-accent focus:ring-1 focus:ring-accent
          outline-none
        "
      >
        <option value="" disabled>
          -- Choose a league --
        </option>
        {leagues.map((league) => (
          <option key={league} value={league}>
            {league}
          </option>
        ))}
      </select>
    </div>
  );
}
