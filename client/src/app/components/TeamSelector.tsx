"use client";

import { useEffect, useState } from "react";
import { Team, TeamSelectorProps } from "@/types/integration.types";
import { getSleeperLeagueSeasonTeams } from "@/api/sleeper";


export default function TeamSelector({
  selected,
  label = "Select Team",
  className = "",
  selectClassName = "",
  onSelect,
  onGetTeams,
  disabled = false,
  id,
  excludeId,
  defaultEmpty = false,
  allowEmpty = false,
}: TeamSelectorProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        if (!id) return;

        const data = await getSleeperLeagueSeasonTeams(id);
        let fetchedTeams: any[] = [];

        if (Array.isArray(data) && data[0] === null) {
          const result = data[1] as { teams?: any[] };
          fetchedTeams = result?.teams ?? [];
        }

        setTeams(fetchedTeams);
        onGetTeams?.(fetchedTeams);

        if (!defaultEmpty && fetchedTeams.length > 0) {
          // Strictly cross-reference rosterId
          const filtered = excludeId 
            ? fetchedTeams.filter((t) => t.id !== excludeId)
            : fetchedTeams;

          if (filtered.length > 0) {
            const defaultTeam = filtered.find((t) => t.default === true);
            onSelect?.(defaultTeam ?? filtered[0]);
          }
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load teams");
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [id, excludeId, defaultEmpty]);

  // Strictly filter using rosterId
  const visibleTeams = excludeId 
    ? teams.filter((t) => t.rosterId !== excludeId)
    : teams;

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
          value={selected?.rosterId ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "") {
              onSelect?.({} as Team);
              return;
            }
            const foundTeam = teams.find(
              (l) => l.rosterId === Number(val)
            );
            if (foundTeam) onSelect?.(foundTeam);
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
          {loading && <option>Loading teams...</option>}

          {!loading && allowEmpty && (
            <option value="">-- Select a Team to Compare --</option>
          )}

          {!loading && visibleTeams.length === 0 && (
            <option value="" disabled>
              No other teams available
            </option>
          )}

          {!loading &&
            visibleTeams.map((t) => (
              <option key={t.rosterId} value={t.rosterId}>
                {t.teamName}
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