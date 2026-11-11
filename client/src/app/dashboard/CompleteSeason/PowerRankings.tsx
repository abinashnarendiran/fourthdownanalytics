import React, { useState } from "react";
import styles from "../../../styles/Dashboard.module.css";
import DataTooltip from "@/app/components/DataTooltip";
import type { PowerRankingViewModel } from "@/types/viewModels/dashboard";

export interface PowerRankingsProps {
  powerRankings: PowerRankingViewModel[];
  isInSeason?: boolean; // Optional flag to show/hide trends
}

const PowerRankings: React.FC<PowerRankingsProps> = ({
  powerRankings,
  isInSeason = false,
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

  const getTrendColor = (trend: string) => {
    if (trend === '▲') return styles.trendUp;
    if (trend === '▼') return styles.trendDown;
    return styles.trendNeutral;
  };

  const formatRankChange = (rankChange: number) => {
    if (rankChange === 0) return '';
    const abs = Math.abs(rankChange);
    return rankChange > 0 ? `+${abs}` : `-${abs}`;
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Fantasy League Power Rankings</h2>
      <p className={styles.subtitle}>
        {isInSeason 
          ? "Current season rankings (updates weekly)"
          : "Complete season rankings (regular season + playoffs + consolation matches)"
        }
      </p>
      <div className={styles.cards}>
        <DataTooltip stats={statsDescriptions} />
        {powerRankings
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
                {/* Top row: Rank, Trend, Owner, Power Score */}
                <div
                  className={styles.topRow}
                  onClick={() => toggleRow(team.rosterId)}>
                  <div className={styles.rankSection}>
                    <div className={styles.rank}>#{team.rank}</div>
                    {isInSeason && (
                      <div className={styles.trendContainer}>
                        <span className={`${styles.trendIcon} ${getTrendColor(team.trend)}`}>
                          {team.trend}
                        </span>
                        {team.rankChange !== 0 && (
                          <span className={styles.rankChange}>
                            {formatRankChange(team.rankChange)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className={styles.ownerColumn}>
                    <div className={styles.teamName}>{team.teamName}</div>
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