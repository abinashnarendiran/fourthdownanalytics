// components/LuckIndex.tsx
import React, { useState } from "react";
import styles from "../../../styles/PowerRankings.module.css"; // reuse your card styles
import { LuckItem } from "./CompleteSeason";

export interface LuckIndexProps {
  luckIndex: LuckItem[];
}

const LuckIndex: React.FC<LuckIndexProps> = ({ luckIndex }) => {
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const toggleRow = (rosterId: string | number) => {
    setExpandedRows((prev) =>
      prev.includes(rosterId.toString())
        ? prev.filter((id) => id !== rosterId.toString())
        : [...prev, rosterId.toString()]
    );
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Luck Index</h2>
      <div className={styles.cards}>
        {luckIndex
          .sort((a, b) => b.luck - a.luck) // optional: sort by luck descending
          .map((team) => {
            const isExpanded = expandedRows.includes(team.rosterId.toString());
            const luckColor = team.luck >= 0 ? "green" : "red";

            return (
              <div key={team.rosterId} className={styles.card}>
                {/* Top row: Owner, Team, Luck */}
                <div
                  className={styles.topRow}
                  onClick={() => toggleRow(team.rosterId)}
                  style={{ cursor: "pointer" }}
                >
                  <div className={styles.ownerColumn}>
                    <div className={styles.owner}>{team.owner}</div>
                    <div style={{ color: luckColor, fontWeight: 600 }}>
                      Luck Index: {team.luck > 0 ? `+${team.luck}` : team.luck}
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
                      <div>Actual Wins: {team.actualWins}</div>
                      <div>Expected Wins: {team.expectedWins}</div>
                      <div>Luck: {team.luck > 0 ? `+${team.luck}` : team.luck}</div>
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

export default LuckIndex;
