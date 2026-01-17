"use client";

import React from "react";
import { LEAGUE_STATUS_LABELS } from "@/constants/leagueStatusSleeper";

export interface LeagueStatusCardProps {
  leagueMetaData: {
    seasonYear: number | string;
    currentWeek: number | null;
    sleeperStatus: string;
    isSeasonFinished: boolean;
  };
}

export const LeagueStatusCard: React.FC<LeagueStatusCardProps> = ({
  leagueMetaData,
}) => {
  const statusKey = leagueMetaData.sleeperStatus as keyof typeof LEAGUE_STATUS_LABELS;
  const statusLabel = LEAGUE_STATUS_LABELS[statusKey] ?? "Unknown";

  // Optional: color mapping for status badges
  const statusColors: Record<string, string> = {
    pre_draft: "bg-accent/10 text-accent",
    drafting: "bg-yellow-100 text-yellow-700",
    in_season: "bg-green-100 text-green-700",
    complete: "bg-gray-100 text-gray-700",
  };
  const badgeClass = statusColors[leagueMetaData.sleeperStatus] ?? "bg-gray-100 text-gray-700";

  return (
    <div className="mt-4 rounded-xl border border-border bg-background p-6 shadow-md transition-all hover:shadow-lg">
      <h3 className="mb-4 text-lg font-semibold text-foreground">League Status</h3>

      <div className="space-y-3 text-sm text-foreground/90">
        <p>
          <span className="font-medium">Season:</span>{" "}
          {leagueMetaData.seasonYear}
        </p>

        <p>
          <span className="font-medium">Current Week:</span>{" "}
          {leagueMetaData.currentWeek ?? "Not started"}
        </p>

        <p className="flex items-center gap-2">
          <span className="font-medium">Status:</span>
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
            {statusLabel}
          </span>
        </p>

        <p>
          <span className="font-medium">Season Finished:</span>{" "}
          {leagueMetaData.isSeasonFinished ? "Yes" : "No"}
        </p>
      </div>
    </div>
  );
};
