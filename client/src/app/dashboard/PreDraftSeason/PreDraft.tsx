"use client";

import React, { useState } from "react";
import styles from "../../../styles/Dashboard.module.css";
import { format } from "date-fns";
import type { PreDraftSeasonViewModel } from "@/types/viewModels/dashboard";

export interface PreDraftProps {
  seasonData: PreDraftSeasonViewModel;
}

const PreDraft: React.FC<PreDraftProps> = ({ seasonData }) => {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  const toggleRow = (index: number) => {
    setExpandedRows((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  // Function to group roster positions and count them
  const formatRosterPositions = (positions: string[]) => {
    const count: Record<string, number> = {};
    positions.forEach((pos) => {
      count[pos] = (count[pos] || 0) + 1;
    });

    // Convert to string like "QB: 2, RB: 2, WR: 3"
    return Object.entries(count)
      .map(([pos, num]) => `${pos}: ${num}`)
      .join(", ");
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Pre-Draft League Info</h2>

      {/* League info */}
      <div className={styles.leagueInfo}>
        <p>
          <strong>Season Year:</strong> {seasonData.seasonYear}
        </p>
        <p>
          <strong>League Type:</strong> {seasonData.leagueType}
        </p>
        <p>
          <strong>Draft Type:</strong>{" "}
          {seasonData.draftType.charAt(0).toUpperCase() +
            seasonData.draftType.slice(1)}
        </p>
        <p>
          <strong>Draft Date:</strong>{" "}
          {format(new Date(seasonData.draftDate), "MMM d, yyyy h:mm a")}
        </p>
        <p>
          <strong>Scoring Type:</strong> {seasonData.scoringType}
        </p>
        <p>
          <strong>Draft Complete:</strong> {seasonData.draftComplete}
        </p>
        <p>
          <strong>Your Draft Position:</strong> {seasonData.draftPosition}
        </p>
        <p>
          <strong>Waiver Type:</strong> {seasonData.wavierType}
        </p>
        <p>
          <strong>Roster Positions:</strong>{" "}
          {formatRosterPositions(seasonData.rosterPositions)}
        </p>
        <p>
          <strong>IR Slots:</strong> {seasonData.IRSlots}
        </p>
        <p>
          <strong>Playoff Teams:</strong> {seasonData.playoffTeams}
        </p>
        <p>
          <strong>Playoff Weeks:</strong> {seasonData.playoffWeeks}
        </p>

        {/* Only show taxiSlots if not a Redraft league */}
        {seasonData.leagueType !== "Redraft" && (
          <p>
            <strong>Taxi Slots:</strong> {seasonData.taxiSlots}
          </p>
        )}

        <p>
          <strong>Trade Deadline Week:</strong> {seasonData.tradeDeadlineWeek}
        </p>
      </div>

      {/* Teams */}
      <h3 className={styles.subtitle}>Teams in the League</h3>
      <div className={styles.cardsPreDraft}>
        {seasonData.teams.map((team, index) => {
          const isExpanded = expandedRows.includes(index);
          return (
            <div
              key={index}
              className={styles.cardPreDraft}
              onClick={() => toggleRow(index)}>
              <div className={styles.topRow}>
                <div className={styles.ownerColumn}>
                  <div className={styles.teamNamePreDraft}>{team.teamName}</div>
                  <div className={styles.ownerNamePreDraft}>
                    {team.ownerName}
                  </div>
                </div>
                {team.coOwners.length > 0 && (
                  <div className={styles.rightSection}>
                    <span
                      className={
                        styles.arrow +
                        (isExpanded ? ` ${styles.arrowExpanded}` : "")
                      }>
                      ▼
                    </span>
                  </div>
                )}
              </div>

              {isExpanded && team.coOwners.length > 0 && (
                <div className={styles.expandedStats}>
                  <div className={styles.statItem}>
                    <small>Co-Owners</small>
                    {team.coOwners.map((co, i) => (
                      <div key={i}>{co}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PreDraft;
