"use client";

import React, { useState } from "react";
import styles from "../../../styles/Dashboard.module.css";
import { compareAsc, format } from "date-fns";

export interface PreDraftTeam {
  teamName: string;
  ownerName: string;
  coOwners: string[];
}

export interface PreDraftData {
  leagueId: string;
  seasonYear: number;
  draftType: string;
  draftDate: string;
  scoringType: string;
  draftComplete: string;
  draftPosition: number;
  wavierType: string;
  teams: PreDraftTeam[];
}

export interface PreDraftProps {
  seasonData: PreDraftData;
}

const PreDraft: React.FC<PreDraftProps> = ({ seasonData }) => {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  const toggleRow = (index: number) => {
    setExpandedRows((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
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
