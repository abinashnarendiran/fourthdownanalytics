"use client";

import { useEffect, useState } from "react";
import type { TeamSelectorProps } from "@/types/viewModels/teamSelector";
import type { TeamRosterOption } from "@/types/viewModels/teamAnalysis";
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
  const [teams, setTeams] = useState<TeamRosterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    let active = true;

    const fetchTeams = async () => {
      if (!id) {
        setTeams([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setSearchText("");
      try {
        const [requestError, fetchedTeams] =
          await getSleeperLeagueSeasonTeams(id);
        if (!active) return;
        if (requestError) {
          setTeams([]);
          setError(requestError.message);
          return;
        }

        setTeams(fetchedTeams);
        onGetTeams?.(fetchedTeams);

        if (!defaultEmpty && fetchedTeams.length > 0) {
          const filtered = excludeId
            ? fetchedTeams.filter((team) => team.rosterId !== excludeId)
            : fetchedTeams;

          if (filtered.length > 0) {
            const defaultTeam = filtered.find((team) => team.default === true);
            onSelect?.(defaultTeam ?? filtered[0]);
          }
        }
      } catch (requestError) {
        if (!active) return;
        setTeams([]);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load teams",
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchTeams();
    return () => {
      active = false;
    };
  }, [defaultEmpty, excludeId, id, onGetTeams, onSelect]);

  const visibleTeams = excludeId
    ? teams.filter((team) => team.rosterId !== excludeId)
    : teams;
  const normalizedSearch = searchText.trim().toLocaleLowerCase();
  const filteredTeams = normalizedSearch
    ? visibleTeams.filter((team) =>
        team.teamName.toLocaleLowerCase().includes(normalizedSearch),
      )
    : visibleTeams;

  return (
    <div className={`w-full max-w-xs ${className}`}>
      <label
        htmlFor={`team-search-${id}`}
        className="mb-1 block text-sm font-medium text-foreground"
      >
        {label}
      </label>

      <div className="space-y-2">
        <input
          id={`team-search-${id}`}
          type="search"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Search teams"
          disabled={disabled || loading}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <div className="relative">
          <select
            id={`team-select-${id}`}
            disabled={disabled || loading}
            value={selected?.rosterId ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "") {
                return;
              }
              const foundTeam = teams.find((l) => l.rosterId === Number(val));
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

            {!loading && filteredTeams.length === 0 && (
              <option value="" disabled>
                {visibleTeams.length === 0
                  ? "No teams available"
                  : "No teams match your search"}
              </option>
            )}

            {!loading &&
              filteredTeams.map((t) => (
                <option key={t.rosterId} value={t.rosterId}>
                  {t.teamName}
                </option>
              ))}
          </select>

          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60">
            ▼
          </span>
        </div>
      </div>

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
