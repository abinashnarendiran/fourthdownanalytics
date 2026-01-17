"use client";

import { useEffect, useState } from "react";
import { getUserLeagues } from "@/api/leagues";
import { FantasyLeague, LeagueSelectorProps } from "@/types/integration.types";

export default function LeagueSelector({
  selected,
  fetchLeagues = true,
  label = "Select League",
  className = "",
  selectClassName = "",
  onSelect,
  onGetLeagues,
  disabled = false,
}: LeagueSelectorProps) {
  const [leagues, setLeagues] = useState<FantasyLeague[]>([]);
  const [loading, setLoading] = useState(fetchLeagues);
  const [error, setError] = useState<string | null>(null);

  // Fetch leagues from API
  useEffect(() => {
    if (!fetchLeagues) {
      setLoading(false);
      return;
    }

    const fetch = async () => {
      try {
        const data = await getUserLeagues();
        let leaguesData: FantasyLeague[] = [];

        if (Array.isArray(data) && data[0] === null) {
          leaguesData = data[1]?.leagues ?? [];
        } else {
          leaguesData = data ?? [];
        }

        setLeagues(leaguesData);
        onGetLeagues?.(leaguesData);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load leagues");
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [fetchLeagues, onGetLeagues]);

  return (
    <div className={`w-full max-w-xs ${className}`}>
      <label
        htmlFor="league"
        className="mb-1 block text-sm font-medium text-foreground"
      >
        {label}
      </label>

      <div className="relative">
        <select
          id="league"
          disabled={disabled || loading}
          value={selected?.leagueId ?? ""}
          onChange={(e) => {
            const league = leagues.find((l) => l.leagueId === e.target.value);
            if (league) onSelect?.(league); // pass the whole league object
          }}
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
          {loading && <option>Loading leagues...</option>}

          {!loading && leagues.length === 0 && (
            <option value="" disabled>No leagues available</option>
          )}

          {!loading &&
            leagues.map((league) => (
              <option key={league.leagueId} value={league.leagueId}>
                {league.leagueName} ({league.seasonYear})
              </option>
            ))}
        </select>

        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60">
          ▼
        </span>
      </div>

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
