import React, { useState } from "react";
import styles from "../../../styles/Dashboard.module.css";
import { PowerRankingsData } from "./CompleteSeason";
import PowerRankingsTooltip from "@/app/components/PowerRankingsTooltip";

export interface PowerRankingsProps {
  finalPowerRankings: PowerRankingsData[];
}

const PowerRankings: React.FC<PowerRankingsProps> = ({
  finalPowerRankings,
}) => {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  const statsDescriptions = [
    {
      label: "Power Score",
      description:
        "Overall performance score combining points, wins, and end-of-season badges.",
    },
    {
      label: "Total Points",
      description: "Points scored during the regular season.",
    },
    {
      label: "Wins",
      description: "Number of matches won during the regular season.",
    },
    { label: "Championship", description: "Winner of the league." },
    { label: "Runner-Up", description: "Second place in the league." },
    {
      label: "Last Place",
      description: "Indicates whether your team finished in last place.",
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
      <h2 className={styles.title}>Fantasy League Power Rankings</h2>
      <p className={styles.subtitle}>
        Complete season rankings (regular season + playoffs + consolation
        matches)
      </p>
      <div className={styles.cards}>
        <PowerRankingsTooltip stats={statsDescriptions} />
        {finalPowerRankings
          .sort((a, b) => a.rank - b.rank)
          .map((team) => {
            const isExpanded = expandedRows.includes(team.rosterId);
            return (
              <div
                key={team.rosterId}
                className={`${styles.card} ${
                  team.rank === 1
                    ? styles.first
                    : team.rank === 2
                      ? styles.second
                      : team.rank === 3
                        ? styles.third
                        : ""
                }`}>
                {/* Top row: Rank, Owner, Power Score */}
                <div
                  className={styles.topRow}
                  onClick={() => toggleRow(team.rosterId)}>
                  <div className={styles.rank}>#{team.rank}</div>
                  <div className={styles.ownerColumn}>
                    <div className={styles.owner}>{team.owner}</div>
                    <div className={styles.powerScore}>
                      Power Score: {team.powerScore.toFixed(1)}
                    </div>
                  </div>
                  <div
                    className={`${styles.arrow} ${isExpanded ? styles.arrowExpanded : ""}`}>
                    ▼
                  </div>
                </div>

                {/* Expanded stats */}
                {isExpanded && (
                  <div className={styles.expandedStats}>
                    <div className={styles.statColumn}>
                      <div>Total Points: {team.totalPoints}</div>
                      <div>Wins: {team.wins}</div>
                    </div>
                    <div className={styles.statColumn}>
                      <div>
                        Championship: {team.championship ? "Yes" : "No"}
                      </div>
                      <div>Runner-Up: {team.runnerUp ? "Yes" : "No"}</div>
                      <div>Last Place: {team.lastPlace ? "Yes" : "No"}</div>
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

export default PowerRankings;
