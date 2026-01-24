import React, { useState } from "react";
import styles from "../../../styles/PowerRankings.module.css";
import { PowerRankingsData } from "./CompleteSeason";
import PowerRankingsTooltip from "@/app/components/PowerRankingsTooltip";

export interface PowerRankingsProps {
  finalPowerRankings: PowerRankingsData[];
}

const PowerRankings: React.FC<PowerRankingsProps> = ({
  finalPowerRankings
}) => {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  // define all stats
  const statsDescriptions = [
    {
      label: "Power Score",
      description:
        "Overall performance score combining points, wins, consistency, playoffs, and schedule difficulty."
    },
    {
      label: "Total Points",
      description: "Points scored during the regular season."
    },
    {
      label: "Playoff Points",
      description: "Points scored during playoffs only."
    },
    {
      label: "Wins",
      description: "Number of matches won during the regular season."
    },
    {
      label: "Expected Wins",
      description:
        "Number of wins your team was expected to have based on league median performance."
    },
    {
      label: "Luck",
      description:
        "Shows how your team's actual wins compare to expected wins. Positive = lucky wins, Negative = unlucky losses."
    },
    {
      label: "Consistency",
      description:
        "Measures how steady your team scored each week. Values closer to 1 = very consistent, values closer to 0 = inconsistent."
    },
    {
      label: "Strength of Schedule",
      description:
        "Measures the difficulty of your opponents relative to the league. Values >1 = tougher opponents, values <1 = easier opponents."
    },
    {
      label: "Championship",
      description: "Winner of the league."
    },
    {
      label: "Runner-Up",
      description: "Second place in the league."
    },
    {
      label: "Last Place",
      description: "Indicates whether your team finished in last place."
    }
  ];

  const toggleRow = (rosterId: number) => {
    setExpandedRows((prev) =>
      prev.includes(rosterId)
        ? prev.filter((id) => id !== rosterId)
        : [...prev, rosterId]
    );
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Fantasy League Power Rankings</h2>
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
                }`}
              >
                {/* Top row: Rank, Owner, Power Score, Arrow */}
                <div
                  className={styles.topRow}
                  onClick={() => toggleRow(team.rosterId)}
                >
                  <div className={styles.rank}>#{team.rank}</div>
                  <div className={styles.ownerColumn}>
                    <div className={styles.owner}>{team.owner}</div>
                    <div className={styles.powerScore}>
                      Power Score: {team.powerScore.toFixed(2)}
                    </div>
                  </div>
                  <div
                    className={`${styles.arrow} ${
                      isExpanded ? styles.arrowExpanded : ""
                    }`}
                  >
                    ▼
                  </div>
                </div>

                {/* Expanded stats */}
                {isExpanded && (
                  <div className={styles.expandedStats}>
                    <div className={styles.statColumn}>
                      <div>Wins: {team.wins}</div>
                      <div>Expected Wins: {team.expectedWins}</div>
                      <div>Playoff Points: {team.playoffPoints.toFixed(2)}</div>
                      <div>Consistency: {team.consistency.toFixed(3)}</div>
                    </div>
                    <div className={styles.statColumn}>
                      <div>Luck: {team.luck}</div>
                      <div>
                        Strength of Schedule:{" "}
                        {team.strengthOfSchedule.toFixed(3)}
                      </div>
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
