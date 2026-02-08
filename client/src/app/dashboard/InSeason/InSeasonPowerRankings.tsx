import React, { useState } from "react";
import styles from "../../../styles/Dashboard.module.css";
import PowerRankingsTooltip from "@/app/components/PowerRankingsTooltip";

export interface InSeasonTeam {
  rosterId: number;
  owner: string;
  teamName: string;
  points: number;
  wins: number;
  weeklyScores: number[];
  weightedScore: number;
  winRatio: number;
  avgOpponentPoints?: number;
  avgMargin?: number;
}

export interface InSeasonPowerRankingsProps {
  inSeasonRankings: InSeasonTeam[];
}

const InSeasonPowerRankings: React.FC<InSeasonPowerRankingsProps> = ({
  inSeasonRankings,
}) => {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  const statsDescriptions = [
    {
      label: "Weighted Score",
      description:
        "Overall power score for dashboard ranking. Primarily based on win ratio, with points scored as a secondary factor.",
    },
    {
      label: "Points",
      description: "Total points your team has scored so far this season.",
    },
    {
      label: "Wins",
      description: "Total number of matchups your team has won.",
    },
    {
      label: "Win Ratio",
      description: "Wins divided by games played. Primary ranking factor.",
    },
    {
      label: "Average Opponent Points",
      description:
        "Average points scored by your opponents each week (context only).",
    },
    {
      label: "Average Margin",
      description: "Average margin of victory or loss per game (context only).",
    },
    {
      label: "Weekly Scores",
      description: "Points your team scored each week (context only).",
    },
  ];

  const toggleRow = (rosterId: number) => {
    setExpandedRows((prev) =>
      prev.includes(rosterId)
        ? prev.filter((id) => id !== rosterId)
        : [...prev, rosterId],
    );
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>In-Season Power Rankings</h2>
      <p className={styles.subtitle}>
        Ranked primarily by wins and weighted score. Optional metrics are
        included for context.
      </p>

      <div className={styles.cards}>
        <PowerRankingsTooltip stats={statsDescriptions} />

        {inSeasonRankings
          .sort((a, b) => b.weightedScore - a.weightedScore)
          .map((team, index) => {
            const isExpanded = expandedRows.includes(team.rosterId);

            return (
              <div
                key={team.rosterId}
                className={`${styles.card} ${
                  index === 0
                    ? styles.first
                    : index === 1
                      ? styles.second
                      : index === 2
                        ? styles.third
                        : ""
                }`}>
                {/* Top row */}
                <div
                  className={styles.topRow}
                  onClick={() => toggleRow(team.rosterId)}>
                  <div className={styles.rank}>#{index + 1}</div>

                  <div className={styles.ownerColumn}>
                    <div className={styles.owner}>{team.owner}</div>
                    <div className={styles.powerScore}>
                      Weighted Score: {team.weightedScore.toFixed(3)}
                    </div>
                  </div>

                  <div
                    className={`${styles.arrow} ${
                      isExpanded ? styles.arrowExpanded : ""
                    }`}>
                    ▼
                  </div>
                </div>

                {/* Expanded stats */}
                {isExpanded && (
                  <div className={styles.expandedStats}>
                    <div className={styles.statColumn}>
                      <div>Points: {team.points}</div>
                      <div>Wins: {team.wins}</div>
                      <div>Win Ratio: {team.winRatio.toFixed(3)}</div>
                      {team.avgOpponentPoints !== undefined && (
                        <div>
                          Avg Opponent Points:{" "}
                          {team.avgOpponentPoints.toFixed(2)}
                        </div>
                      )}
                      {team.avgMargin !== undefined && (
                        <div>Avg Margin: {team.avgMargin.toFixed(2)}</div>
                      )}
                    </div>

                    <div className={styles.statColumn}>
                      <div>
                        Weekly Scores:{" "}
                        {team.weeklyScores.map((score, i) => (
                          <span key={i}>
                            {score}
                            {i < team.weeklyScores.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </div>
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

export default InSeasonPowerRankings;
