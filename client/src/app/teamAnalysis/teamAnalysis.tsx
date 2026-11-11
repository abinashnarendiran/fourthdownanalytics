"use client";

import React from "react";
import type { TeamAnalysisData } from "@/types/viewModels/teamAnalysis";

interface TeamAnalysisViewProps {
  data: TeamAnalysisData;
}

interface ChartPoint {
  x: number;
  y: number;
}

const formatWins = (wins: number) => wins.toFixed(2);

const getLuckCategory = (luckIndex: number) => {
  if (luckIndex > 1) {
    return {
      label: "Lucky",
      className: "bg-emerald-100 text-emerald-800",
    };
  }
  if (luckIndex < -1) {
    return {
      label: "Unlucky",
      className: "bg-rose-100 text-rose-800",
    };
  }
  return {
    label: "Neutral",
    className: "bg-muted text-muted-foreground",
  };
};

const getChartPoints = (
  values: number[],
  minValue: number,
  maxValue: number,
): ChartPoint[] => {
  const chartWidth = 920;
  const chartHeight = 220;
  const left = 40;
  const top = 24;
  const range = maxValue - minValue || 1;

  return values.map((value, index) => ({
    x:
      left +
      (values.length > 1
        ? (index / (values.length - 1)) * chartWidth
        : chartWidth / 2),
    y: top + chartHeight - ((value - minValue) / range) * chartHeight,
  }));
};

const pointsToPath = (points: ChartPoint[]) =>
  points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

const TeamAnalysisView: React.FC<TeamAnalysisViewProps> = ({ data }) => {
  const { team } = data;
  const weeklyScores = team.averages.weeklyVsLeague ?? [];
  const chartScores = weeklyScores.flatMap((week) => [
    week.teamPoints,
    week.leagueAvg,
  ]);
  const minValue = chartScores.length > 0 ? Math.min(...chartScores) : 0;
  const maxValue = chartScores.length > 0 ? Math.max(...chartScores) : 1;
  const teamPoints = getChartPoints(
    weeklyScores.map((week) => week.teamPoints),
    minValue,
    maxValue,
  );
  const leaguePoints = getChartPoints(
    weeklyScores.map((week) => week.leagueAvg),
    minValue,
    maxValue,
  );
  const luck = getLuckCategory(team.luck.luckIndex);
  const positions = team.positionalOverview ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{team.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manager: {team.owner} · {team.winAnalysis.record} record
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${luck.className}`}
        >
          {luck.label}
        </span>
      </header>

      <section
        aria-label="Expected wins and luck"
        className="grid gap-4 sm:grid-cols-3"
      >
        <article className="rounded-xl border border-border bg-background p-5">
          <p className="text-sm font-medium text-muted-foreground">
            Actual Wins
          </p>
          <p className="mt-2 text-3xl font-bold">
            {formatWins(team.winAnalysis.actualWins)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {team.winAnalysis.actualLosses} losses
            {team.winAnalysis.actualTies > 0
              ? ` · ${team.winAnalysis.actualTies} ties`
              : ""}
          </p>
        </article>
        <article className="rounded-xl border border-border bg-background p-5">
          <p className="text-sm font-medium text-muted-foreground">
            Expected Wins (xW)
          </p>
          <p className="mt-2 text-3xl font-bold">
            {formatWins(team.winAnalysis.expectedWins)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Fractional all-play win expectation
          </p>
        </article>
        <article className="rounded-xl border border-border bg-background p-5">
          <p className="text-sm font-medium text-muted-foreground">
            Luck Index
          </p>
          <p className="mt-2 text-3xl font-bold">
            {team.luck.luckIndex > 0 ? "+" : ""}
            {team.luck.luckIndex.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Actual wins minus expected wins
          </p>
        </article>
      </section>

      <section className="rounded-xl border border-border bg-background p-5">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Weekly Points</h3>
            <p className="text-sm text-muted-foreground">
              Team output compared with the league average
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-accent" />
              Team
            </span>
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
              League average
            </span>
          </div>
        </div>
        {weeklyScores.length === 0 ? (
          <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-border px-6 text-center text-sm text-muted-foreground">
            Weekly scores are not available yet. The chart will appear when
            matchup data is recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <svg
              aria-label="Weekly team points and league average line chart"
              className="h-72 min-w-150 w-full"
              role="img"
              viewBox="0 0 1000 300"
            >
              {[0, 1, 2, 3].map((line) => {
                const y = 24 + line * (220 / 3);
                return (
                  <line
                    key={line}
                    className="stroke-border"
                    x1="40"
                    x2="960"
                    y1={y}
                    y2={y}
                    strokeWidth="1"
                  />
                );
              })}
              <path
                d={pointsToPath(leaguePoints)}
                className="fill-none stroke-muted-foreground"
                strokeDasharray="6 5"
                strokeWidth="3"
              />
              <path
                d={pointsToPath(teamPoints)}
                className="fill-none stroke-accent"
                strokeWidth="4"
              />
              {weeklyScores.map((week, index) => (
                <g key={week.week}>
                  <circle
                    className="fill-accent"
                    cx={teamPoints[index]?.x}
                    cy={teamPoints[index]?.y}
                    r="5"
                  >
                    <title>
                      Week {week.week}: {week.teamPoints.toFixed(2)} points
                    </title>
                  </circle>
                  <circle
                    className="fill-muted-foreground"
                    cx={leaguePoints[index]?.x}
                    cy={leaguePoints[index]?.y}
                    r="4"
                  >
                    <title>
                      Week {week.week} league average:{" "}
                      {week.leagueAvg.toFixed(2)} points
                    </title>
                  </circle>
                  <text
                    className="fill-muted-foreground"
                    x={teamPoints[index]?.x}
                    y="274"
                    textAnchor="middle"
                    fontSize="12"
                  >
                    W{week.week}
                  </text>
                </g>
              ))}
              <text
                className="fill-muted-foreground"
                x="40"
                y="18"
                fontSize="11"
              >
                {maxValue.toFixed(0)} pts
              </text>
              <text
                className="fill-muted-foreground"
                x="40"
                y="258"
                fontSize="11"
              >
                {minValue.toFixed(0)} pts
              </text>
            </svg>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Positional Overview</h3>
          <p className="text-sm text-muted-foreground">
            Roster depth and scoring compared with the league baseline
          </p>
        </div>
        {positions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Positional roster data is not available yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {positions.map((position) => (
              <article
                key={position.position}
                className="rounded-xl border border-border bg-background p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-base font-semibold">
                      {position.position}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {position.rosterCount} rostered
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      position.vsLeagueAverage === null
                        ? "bg-muted text-muted-foreground"
                        : position.vsLeagueAverage > 0
                          ? "bg-emerald-100 text-emerald-800"
                          : position.vsLeagueAverage < 0
                            ? "bg-amber-100 text-amber-800"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {position.vsLeagueAverage === null
                      ? "Scores pending"
                      : position.vsLeagueAverage > 0
                        ? "Strength"
                        : position.vsLeagueAverage < 0
                          ? "Opportunity"
                          : "At average"}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <p>
                    Avg. points:{" "}
                    <strong>{position.averagePoints?.toFixed(2) ?? "—"}</strong>
                  </p>
                  <p>
                    League avg.:{" "}
                    <strong>
                      {position.leagueAveragePoints?.toFixed(2) ?? "—"}
                    </strong>
                  </p>
                </div>
                {position.players.length > 0 ? (
                  <ul className="mt-4 divide-y divide-border">
                    {position.players.map((player) => (
                      <li
                        key={player.playerId}
                        className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                      >
                        <span className="font-medium">{player.name}</span>
                        <span className="text-muted-foreground">
                          {[player.team, player.status]
                            .filter(Boolean)
                            .join(" · ") || "Rostered"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Player details are not available.
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default TeamAnalysisView;
