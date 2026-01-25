// components/LuckIndex.tsx
import React, { useState } from "react";
import styles from "../../../styles/Dashboard.module.css";
import { LuckItem } from "./CompleteSeason";

export interface LuckIndexProps {
  luckIndex: LuckItem[];
}

const LuckIndex: React.FC<LuckIndexProps> = ({ luckIndex }) => {
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const toggleRow = (id: string | number) =>
    setExpandedRows((prev) =>
      prev.includes(id.toString())
        ? prev.filter((i) => i !== id.toString())
        : [...prev, id.toString()],
    );

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Luck Index</h2>
      <p className={styles.subtitle}>
        Includes regular season, playoffs (Winners & Losers brackets), and
        consolation matches.
      </p>
      <div className={styles.cards}>
        {luckIndex
          .sort((a, b) => b.luck - a.luck)
          .map((team, index) => {
            const isExpanded = expandedRows.includes(team.rosterId.toString());
            const badgeClass =
              team.luck >= 0 ? styles.luckBadgePos : styles.luckBadgeNeg;

            return (
              <div
                key={team.rosterId}
                className={`${styles.card} ${index === 0 ? styles.first : index === 1 ? styles.second : index === 2 ? styles.third : ""}`}>
                <div
                  className={styles.topRow}
                  onClick={() => toggleRow(team.rosterId)}>
                  <div className={styles.leftSection}>
                    <span className={styles.rank}>#{index + 1}</span>
                    <div className={styles.ownerColumn}>
                      <div className={styles.owner}>{team.owner}</div>
                      <div className={styles.teamName}>
                        {team.teamName || "No Team Name"}
                      </div>
                    </div>
                  </div>
                  <div className={styles.rightSection}>
                    <div className={`${styles.badge} ${badgeClass}`}>
                      {team.luck > 0 ? `+${team.luck}` : team.luck} Luck
                    </div>
                    <div
                      className={`${styles.arrow} ${isExpanded ? styles.arrowExpanded : ""}`}>
                      ▼
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className={styles.expandedStats}>
                    <div className={styles.statItem}>
                      <small>ACTUAL</small>
                      <strong>{team.actualWins}W</strong>
                    </div>
                    <div className={styles.statItem}>
                      <small>EXPECTED</small>
                      <strong>{team.expectedWins.toFixed(1)}W</strong>
                    </div>
                    <div className={styles.statItem}>
                      <small>LUCK</small>
                      <strong>{team.luck}</strong>
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
