"use client";

import React from "react";
import { LEAGUE_STATUS } from "@/constants/leagueStatusSleeper";
import "../../styles/LeagueStatus.css"; // Make sure you import the CSS file

export interface LeagueStatusCardProps {
  leagueMetaData: {
    seasonYear: number | string;
    currentWeek: number | null;
    leagueStatus: string;
    seasonFinished: boolean;
  };
}

export const LeagueStatusCard: React.FC<LeagueStatusCardProps> = ({
  leagueMetaData,
}) => {
  const statusEntry = Object.values(LEAGUE_STATUS).find(
    (status) => status.value === leagueMetaData.leagueStatus,
  );

  const statusLabel = statusEntry?.label ?? "Unknown";

  const statusColors: Record<string, string> = {
    pre_draft: "bg-pre_draft",
    drafting: "bg-drafting",
    in_season: "bg-in_season",
    complete: "bg-complete",
  };

  const badgeClass =
    statusColors[leagueMetaData.leagueStatus] ?? "badge-complete";

  const currentWeekDisplay = (() => {
    if (leagueMetaData.seasonFinished) return "—";
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
          <span className="label">Full NFL Season and Playoffs Finished:</span>{" "}
          {leagueMetaData.seasonFinished ? "Yes" : "No"}
        </p>
      </div>
    </div>
  );
};
