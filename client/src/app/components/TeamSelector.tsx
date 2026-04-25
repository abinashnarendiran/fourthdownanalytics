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
}: TeamSelectorProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Always fetch leagues on mount
  useEffect(() => {
    const fetchTeams = async () => {
      try {

        if (!id) return;

        const data = await getSleeperLeagueSeasonTeams(id);

        let teams: any[] = [];

        if (Array.isArray(data) && data[0] === null) {
          const result = data[1] as { teams?: any[] };
          teams = result?.teams ?? [];
        }

        setTeams(teams);
        onGetTeams?.(teams);

        // 🔥 NEW LOGIC: Select default or first team
        if (teams.length > 0) {
          const defaultTeam = teams.find((team) => team.default === true);

          const teamToSelect = defaultTeam ?? teams[0];

          onSelect?.(teamToSelect);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load teams");
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [id]);

  return (
    <div className={`w-full max-w-xs ${className}`}>
      <label
        htmlFor="league"
        className="mb-1 block text-sm font-medium text-foreground">
        {label}
      </label>

      <div className="relative">
        <select
          id="league"
          disabled={disabled || loading}
          value={selected?.rosterId ?? 1}
          onChange={(e) => {
            const team = teams.find(
              (l) => l.rosterId === Number(e.target.value),
            );
            if (team) onSelect?.(team); // pass the whole team object
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
            ${selectClassName}`}>
          {loading && <option>Loading teams...</option>}

          {!loading && teams.length === 0 && (
            <option
              value=""
              disabled>
              No teams available
            </option>
          )}

          {!loading &&
            teams.map((team) => (
              <option
                key={team.rosterId}
                value={team.rosterId}>
                {team.teamName}
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
