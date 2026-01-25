// components/LineupEfficiency.tsx
import React, { useState } from "react";
import styles from "../../../styles/Dashboard.module.css"; // reuse your card styles
import { LineupEfficiencyItem } from "./CompleteSeason";

export interface LineupEfficiencyProps {
  lineupEfficiency: LineupEfficiencyItem[];
}

const LineupEfficiency: React.FC<LineupEfficiencyProps> = ({
  lineupEfficiency,
}) => {
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const toggleRow = (id: string | number) =>
    setExpandedRows((prev) =>
      prev.includes(id.toString())
        ? prev.filter((i) => i !== id.toString())
        : [...prev, id.toString()],
    );

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Lineup Efficiency</h2>
      <p className={styles.subtitle}>
        Includes regular season, playoffs (Winners & Losers brackets), and
        consolation matches.
      </p>
      <div className={styles.cards}>
        {lineupEfficiency
          .sort((a, b) => b.efficiency - a.efficiency)
          .map((team, index) => {
            const isExpanded = expandedRows.includes(team.rosterId.toString());
            let badgeClass =
              team.efficiency >= 90
                ? styles.luckBadgePos
                : team.efficiency >= 80
                  ? styles.badgeWarn
                  : styles.luckBadgeNeg;

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
                      {team.efficiency}%
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
                      <strong>{team.actual}</strong>
                    </div>
                    <div className={styles.statItem}>
                      <small>OPTIMAL</small>
                      <strong>{team.optimal}</strong>
                    </div>
                    <div className={styles.statItem}>
                      <small>MISSED</small>
                      <strong>{team.missedPoints}</strong>
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

export default LineupEfficiency;
