"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getSleeperTeamComparison } from "@/api/sleeper";
import type { DashboardLeagueStatus } from "@/types/viewModels/dashboard";
import type {
  TeamAnalysisPosition,
  TeamComparisonData,
  TeamRosterOption,
} from "@/types/viewModels/teamAnalysis";

interface TeamComparisonDrawerProps {
  open: boolean;
  onClose: () => void;
  leagueId: string;
  week: number;
  seasonStatus: DashboardLeagueStatus["leagueStatus"];
  primaryTeam: TeamRosterOption;
  teams: TeamRosterOption[];
}

const formatPoints = (points: number | null) =>
  points === null ? "—" : points.toFixed(2);

const getPosition = (positions: TeamAnalysisPosition[], positionName: string) =>
  positions.find((position) => position.position === positionName);

const TeamComparisonDrawer: React.FC<TeamComparisonDrawerProps> = ({
  open,
  onClose,
  leagueId,
  week,
  seasonStatus,
  primaryTeam,
  teams,
}) => {
  const [selectedRosterId, setSelectedRosterId] = useState<number | null>(null);
  const [comparison, setComparison] = useState<TeamComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const availableTeams = useMemo(
    () => teams.filter((team) => team.rosterId !== primaryTeam.rosterId),
    [primaryTeam.rosterId, teams],
  );
  const selectedTeam = availableTeams.find(
    (team) => team.rosterId === selectedRosterId,
  );

  const closeDrawer = useCallback(() => {
    setLoading(false);
    setError("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open || selectedRosterId === null) return;

    let active = true;

    const fetchComparison = async () => {
      const [requestError, result] = await getSleeperTeamComparison(
        leagueId,
        week,
        primaryTeam.rosterId,
        selectedRosterId,
        seasonStatus,
      );
      if (!active) return;

      if (requestError) {
        setError(requestError.message);
        setComparison(null);
      } else {
        setComparison(result);
      }
      setLoading(false);
    };

    void fetchComparison().catch((requestError: unknown) => {
      if (!active) return;
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load team comparison",
      );
      setComparison(null);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [
    leagueId,
    open,
    primaryTeam.rosterId,
    seasonStatus,
    selectedRosterId,
    week,
  ]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeDrawer, open]);

  const positionNames = useMemo(() => {
    if (!comparison) return [];
    return [
      ...new Set([
        ...comparison.primaryTeam.positionalOverview.map(
          (position) => position.position,
        ),
        ...comparison.secondaryTeam.positionalOverview.map(
          (position) => position.position,
        ),
      ]),
    ].sort((a, b) => a.localeCompare(b));
  }, [comparison]);

  const primaryName = comparison?.primaryTeam.name ?? primaryTeam.teamName;
  const secondaryName =
    comparison?.secondaryTeam.name ?? selectedTeam?.teamName;

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close team comparison"
          onClick={closeDrawer}
          className="fixed inset-0 z-40 cursor-default bg-foreground/30"
        />
      )}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-comparison-title"
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-border bg-background shadow-xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border p-6">
          <div>
            <h2 id="team-comparison-title" className="text-xl font-bold">
              Head-to-Head Comparison
            </h2>
            <p className="mt-1 text-sm text-foreground/60">
              Compare power scores, positional scoring, and estimated matchup
              odds.
            </p>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-foreground/5 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            Close
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div>
            <span
              id="comparison-roster-label"
              className="mb-2 block text-sm font-semibold"
            >
              Compare against
            </span>
            <select
              id="comparison-roster"
              aria-labelledby="comparison-roster-label"
              value={selectedRosterId ?? ""}
              onChange={(event) => {
                const rosterId = Number(event.target.value);
                setSelectedRosterId(
                  Number.isInteger(rosterId) && rosterId > 0 ? rosterId : null,
                );
                setLoading(Number.isInteger(rosterId) && rosterId > 0);
                setError("");
                setComparison(null);
              }}
              className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm font-normal text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            >
              <option value="">Select a team</option>
              {availableTeams.map((team) => (
                <option key={team.rosterId} value={team.rosterId}>
                  {team.teamName}
                </option>
              ))}
            </select>
          </div>

          {availableTeams.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-foreground/60">
              There are no other rosters available in this league.
            </div>
          ) : !selectedTeam ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-foreground/60">
              Choose a roster to see the comparison.
            </div>
          ) : loading ? (
            <div
              role="status"
              className="flex min-h-48 items-center justify-center rounded-xl border border-border text-sm text-foreground/60"
            >
              Loading comparison data…
            </div>
          ) : error ? (
            <div
              role="alert"
              className="rounded-xl border border-border bg-foreground/5 p-5 text-sm text-foreground"
            >
              <p className="font-semibold">Could not load comparison</p>
              <p className="mt-1">{error}</p>
            </div>
          ) : comparison ? (
            <>
              <section className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-xl border border-border bg-background p-4">
                  <p className="text-sm text-foreground/60">{primaryName}</p>
                  <p className="mt-2 text-2xl font-bold">
                    {comparison.primaryPowerScore.toFixed(1)}
                  </p>
                  <p className="text-xs text-foreground/60">
                    Points + 5 per win
                  </p>
                </article>
                <article className="rounded-xl border border-border bg-background p-4">
                  <p className="text-sm text-foreground/60">{secondaryName}</p>
                  <p className="mt-2 text-2xl font-bold">
                    {comparison.secondaryPowerScore.toFixed(1)}
                  </p>
                  <p className="text-xs text-foreground/60">
                    Points + 5 per win
                  </p>
                </article>
                <article className="rounded-xl border border-border bg-background p-4 sm:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">
                      Estimated matchup probability
                    </p>
                    <p className="text-xs text-foreground/60">
                      Based on scoring averages and weekly variance
                    </p>
                  </div>
                  {comparison.primaryWinProbability === null ||
                  comparison.secondaryWinProbability === null ? (
                    <p className="mt-3 text-sm text-foreground/60">
                      Probability is unavailable until both teams have scored
                      games.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>{primaryName}</span>
                        <strong>
                          {comparison.primaryWinProbability.toFixed(1)}%
                        </strong>
                      </div>
                      <div
                        role="img"
                        aria-label={`${primaryName}: ${comparison.primaryWinProbability.toFixed(1)} percent, ${secondaryName}: ${comparison.secondaryWinProbability.toFixed(1)} percent`}
                        className="flex h-3 overflow-hidden rounded-full bg-border"
                      >
                        <div
                          className="bg-accent transition-[width]"
                          style={{
                            width: `${comparison.primaryWinProbability}%`,
                          }}
                        />
                        <div
                          className="bg-foreground/40 transition-[width]"
                          style={{
                            width: `${comparison.secondaryWinProbability}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{secondaryName}</span>
                        <strong>
                          {comparison.secondaryWinProbability.toFixed(1)}%
                        </strong>
                      </div>
                    </div>
                  )}
                </article>
              </section>

              <section>
                <div className="mb-3">
                  <h3 className="font-semibold">Position-by-position</h3>
                  <p className="text-xs text-foreground/60">
                    Starting-lineup points per position, compared with the
                    league positional average.
                  </p>
                </div>
                {positionNames.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-foreground/60">
                    Positional scores are not available yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {positionNames.map((positionName) => {
                      const primaryPosition = getPosition(
                        comparison.primaryTeam.positionalOverview,
                        positionName,
                      );
                      const secondaryPosition = getPosition(
                        comparison.secondaryTeam.positionalOverview,
                        positionName,
                      );
                      const primaryPoints =
                        primaryPosition?.averagePoints ?? null;
                      const secondaryPoints =
                        secondaryPosition?.averagePoints ?? null;
                      const maximum = Math.max(
                        primaryPoints ?? 0,
                        secondaryPoints ?? 0,
                        1,
                      );
                      const primaryWidth = Math.max(
                        0,
                        Math.min(100, ((primaryPoints ?? 0) / maximum) * 100),
                      );
                      const secondaryWidth = Math.max(
                        0,
                        Math.min(100, ((secondaryPoints ?? 0) / maximum) * 100),
                      );

                      return (
                        <article
                          key={positionName}
                          className="rounded-lg border border-border p-4"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <h4 className="font-semibold">{positionName}</h4>
                            <span className="text-xs text-foreground/60">
                              {primaryPosition?.rosterCount ?? 0} vs.{" "}
                              {secondaryPosition?.rosterCount ?? 0} rostered
                            </span>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <div className="mb-1 flex justify-between text-xs">
                                <span>{primaryName}</span>
                                <span>
                                  {formatPoints(primaryPoints)} starter pts/wk
                                </span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-border">
                                <div
                                  className="h-full rounded-full bg-accent"
                                  style={{ width: `${primaryWidth}%` }}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="mb-1 flex justify-between text-xs">
                                <span>{secondaryName}</span>
                                <span>
                                  {formatPoints(secondaryPoints)} starter pts/wk
                                </span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-border">
                                <div
                                  className="h-full rounded-full bg-foreground/40"
                                  style={{ width: `${secondaryWidth}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-foreground/60">
                            <p>
                              {primaryName} league avg.:{" "}
                              {formatPoints(
                                primaryPosition?.leagueAveragePoints ?? null,
                              )}
                            </p>
                            <p>
                              {secondaryName} league avg.:{" "}
                              {formatPoints(
                                secondaryPosition?.leagueAveragePoints ?? null,
                              )}
                            </p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-foreground/60">
              Comparison data will appear when available.
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default TeamComparisonDrawer;
