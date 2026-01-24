"use client";

import React from "react";
import { LEAGUE_STATUS_LABELS } from "@/constants/leagueStatusSleeper";
import "../../styles/LeagueStatus.css"; // Make sure you import the CSS file

export interface LeagueStatusCardProps {
  leagueMetaData: {
    seasonYear: number | string;
    currentWeek: number | null;
    leagueStatus: string;
    isSeasonFinished: boolean;
  };
}

export const LeagueStatusCard: React.FC<LeagueStatusCardProps> = ({
  leagueMetaData,
}) => {
  const statusKey =
    leagueMetaData.leagueStatus as keyof typeof LEAGUE_STATUS_LABELS;

  const statusLabel = LEAGUE_STATUS_LABELS[statusKey] ?? "Unknown";

  const statusColors: Record<string, string> = {
    pre_draft: "badge-pre_draft",
    drafting: "badge-drafting",
    in_season: "badge-in_season",
    complete: "badge-complete",
  };

  const badgeClass =
    statusColors[leagueMetaData.leagueStatus] ?? "badge-complete";

  const currentWeekDisplay = (() => {
    if (leagueMetaData.isSeasonFinished) return "—";
    if (leagueMetaData.currentWeek === null) return "Not started";
    return `Week ${leagueMetaData.currentWeek}`;
  })();

  return (
    <div className="league-card">
      <h3 className="league-title">League Status</h3>

      <div className="league-content">
        <p>
          <span className="label">Season:</span> {leagueMetaData.seasonYear}
        </p>

        <p>
          <span className="label">Current Week:</span> {currentWeekDisplay}
        </p>

        <p>
          <span className="label">Status:</span>{" "}
          <span className={`badge ${badgeClass}`}>{statusLabel}</span>
        </p>

        <p>
          <span className="label">Season Finished:</span>{" "}
          {leagueMetaData.isSeasonFinished ? "Yes" : "No"}
        </p>
      </div>
    </div>
  );
};
