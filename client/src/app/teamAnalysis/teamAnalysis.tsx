"use client";

import React from "react";
import type {
  TeamAnalysisData,
  TeamAnalysisMetricTab,
} from "@/types/viewModels/teamAnalysis";

interface TeamAnalysisViewProps {
  data: TeamAnalysisData;
  activeMetric: TeamAnalysisMetricTab;
  onMetricChange: (metric: TeamAnalysisMetricTab) => void;
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

const getRadarPolygon = (
  values: Array<number | null>,
  maximum: number,
  center: number,
  radius: number,
) =>
  values
    .map((value, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / values.length;
      const distance = (Math.max(value ?? 0, 0) / maximum) * radius;
      return `${center + Math.cos(angle) * distance},${center + Math.sin(angle) * distance}`;
    })
    .join(" ");

const TeamAnalysisView: React.FC<TeamAnalysisViewProps> = ({
  data,
  activeMetric,
  onMetricChange,
}) => {
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
  const schedule = team.scheduleLuck;
  const radar = team.positionalRadar ?? [];
  const radarMaximum = Math.max(
    ...radar.flatMap((axis) => [
      axis.team ?? 0,
      axis.leagueAverage ?? 0,
      axis.leagueLeader ?? 0,
    ]),
    1,
  );
  const radarCenter = 180;
  const radarRadius = 120;
  const anyRadarData = radar.some(
    (axis) =>
      axis.team !== null ||
      axis.leagueAverage !== null ||
      axis.leagueLeader !== null,
  );
  const tabs: Array<{ key: TeamAnalysisMetricTab; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "schedule", label: "Schedule & Coaching" },
    { key: "positions", label: "Positions" },
  ];

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

      <nav
        aria-label="Team analysis metrics"
        className="flex flex-wrap gap-2 border-b border-border pb-3"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            aria-current={activeMetric === tab.key ? "page" : undefined}
            onClick={() => onMetricChange(tab.key)}
            className={`rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-accent ${
              activeMetric === tab.key
                ? "bg-accent text-background"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeMetric === "overview" && (
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
      )}

      {activeMetric === "schedule" && (
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-background p-5">
            <div className="mb-5">
              <h3 className="text-lg font-semibold">Schedule Luck</h3>
              <p className="text-sm text-muted-foreground">
                Deterministic replay of your weekly scores against every other
                manager’s regular-season schedule template.
              </p>
            </div>
            {schedule.schedulesEvaluated === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Alternate schedule results will appear when complete weekly
                scores are available.
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {schedule.distribution.map((result) => (
                    <div
                      key={result.wins}
                      className="grid grid-cols-[5rem_1fr_5rem] items-center gap-3 text-sm"
                    >
                      <span>
                        {result.wins.toFixed(1)}–{result.losses.toFixed(1)}
                      </span>
                      <div
                        role="img"
                        aria-label={`${result.probability.toFixed(1)} percent of schedules`}
                        className="h-3 overflow-hidden rounded-full bg-border"
                      >
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${result.probability}%` }}
                        />
                      </div>
                      <span className="text-right text-muted-foreground">
                        {result.count}{" "}
                        {result.count === 1 ? "schedule" : "schedules"}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  {schedule.schedulesEvaluated} of {schedule.schedulesAvailable}{" "}
                  schedules evaluated across {schedule.weeksPerSchedule}{" "}
                  available weeks. {schedule.incompleteSchedules} incomplete
                  schedules omitted. Ties count as half a win.
                </p>
              </>
            )}
          </section>

          <section className="rounded-xl border border-border bg-background p-5">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">
                Coaching Efficiency Index
              </h3>
              <p className="text-sm text-muted-foreground">
                Actual starter points divided by the best legal lineup using
                observed player scores.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <article className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">Coaching IQ</p>
                <p className="mt-2 text-2xl font-bold">
                  {team.coaching.coachingIQ === null
                    ? "—"
                    : `${team.coaching.coachingIQ.toFixed(1)}%`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {team.coaching.weeksIncluded} scored weeks
                </p>
              </article>
              <article className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">Points Left</p>
                <p className="mt-2 text-2xl font-bold">
                  {team.coaching.pointsLeft?.toFixed(2) ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Optimal minus actual starter points
                </p>
              </article>
              <article className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">Weekly Score σ</p>
                <p className="mt-2 text-2xl font-bold">
                  {team.scoredWeeks > 0
                    ? team.coaching.weeklyScoreStdDev.toFixed(2)
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Population standard deviation
                </p>
              </article>
            </div>
            {team.dataCoverage.omittedWeeks > 0 ||
            team.coaching.weeksUnavailable > 0 ||
            team.coaching.metadataWarnings.length > 0 ? (
              <p className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                Coverage: {team.dataCoverage.scoredWeeks} of{" "}
                {team.dataCoverage.requestedWeeks} requested weeks have team
                scores; {team.coaching.weeksUnavailable} lineup weeks were
                unavailable. Some figures may be incomplete.
              </p>
            ) : null}
            {team.coaching.metadataWarnings.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {team.coaching.metadataWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>
      )}

      {activeMetric === "positions" && (
        <>
          <section className="rounded-xl border border-border bg-background p-5">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">
                Positional Starter Quality
              </h3>
              <p className="text-sm text-muted-foreground">
                Mean actual starter points per week, including flex starters
                by player position, against the league average and leader.
              </p>
              {radar.some((axis) =>
                [axis.team, axis.leagueAverage, axis.leagueLeader].some(
                  (value) => value !== null && value < 0,
                ),
              ) && (
                <p className="text-sm text-muted-foreground">
                  Negative values are plotted at the center.
                </p>
              )}
            </div>
            {!anyRadarData ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Positional radar metrics are unavailable until starter and
                player score data are recorded.
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <svg
                  role="img"
                  aria-label="Selected team, league average, and league leader positional radar"
                  viewBox="0 0 360 360"
                  className="h-80 w-full max-w-sm"
                >
                  {[0.25, 0.5, 0.75, 1].map((scale) => (
                    <polygon
                      key={scale}
                      points={getRadarPolygon(
                        radar.map(() => radarMaximum * scale),
                        radarMaximum,
                        radarCenter,
                        radarRadius,
                      )}
                      className="fill-none stroke-border"
                      strokeWidth="1"
                    />
                  ))}
                  {radar.map((axis, index) => {
                    const angle =
                      -Math.PI / 2 + (index * 2 * Math.PI) / radar.length;
                    const x = radarCenter + Math.cos(angle) * radarRadius;
                    const y = radarCenter + Math.sin(angle) * radarRadius;
                    return (
                      <g key={axis.position}>
                        <line
                          className="stroke-border"
                          x1={radarCenter}
                          y1={radarCenter}
                          x2={x}
                          y2={y}
                        />
                        <text
                          className="fill-foreground"
                          x={radarCenter + Math.cos(angle) * (radarRadius + 18)}
                          y={radarCenter + Math.sin(angle) * (radarRadius + 18)}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="12"
                        >
                          {axis.position}
                        </text>
                      </g>
                    );
                  })}
                  <polygon
                    points={getRadarPolygon(
                      radar.map((axis) => axis.leagueLeader),
                      radarMaximum,
                      radarCenter,
                      radarRadius,
                    )}
                    className="fill-foreground/5 stroke-foreground/50"
                    strokeWidth="2"
                  />
                  <polygon
                    points={getRadarPolygon(
                      radar.map((axis) => axis.leagueAverage),
                      radarMaximum,
                      radarCenter,
                      radarRadius,
                    )}
                    className="fill-muted-foreground/10 stroke-muted-foreground"
                    strokeWidth="2"
                    strokeDasharray="5 4"
                  />
                  <polygon
                    points={getRadarPolygon(
                      radar.map((axis) => axis.team),
                      radarMaximum,
                      radarCenter,
                      radarRadius,
                    )}
                    className="fill-accent/20 stroke-accent"
                    strokeWidth="3"
                  />
                </svg>
                <div className="space-y-3 text-sm">
                  {[
                    ["Team", "bg-accent"],
                    ["League average", "bg-muted-foreground"],
                    ["League leader", "bg-foreground/50"],
                  ].map(([label, swatch]) => (
                    <p key={label} className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${swatch}`} />
                      {label}
                    </p>
                  ))}
                  {radar.map((axis) => (
                    <p key={axis.position} className="text-muted-foreground">
                      {axis.position}: {axis.team?.toFixed(2) ?? "—"} pts/wk
                    </p>
                  ))}
                </div>
              </div>
            )}
          </section>
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Positional Overview</h3>
              <p className="text-sm text-muted-foreground">
                Roster depth and scoring compared with the league baseline
              </p>
              <p className="text-sm text-muted-foreground">
                Averages include only position-weeks with complete starter
                scores and known starter positions.
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
                        <strong>
                          {position.averagePoints?.toFixed(2) ?? "—"}
                        </strong>
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
        </>
      )}
    </div>
  );
};

export default TeamAnalysisView;
