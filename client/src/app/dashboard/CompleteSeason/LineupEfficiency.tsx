// components/LineupEfficiency.tsx
import React, { useState } from "react";
import styles from "../../../styles/PowerRankings.module.css"; // reuse your card styles
import { LineupEfficiencyItem } from "./CompleteSeason";



export interface LineupEfficiencyProps {
  lineupEfficiency: LineupEfficiencyItem[];
}

const LineupEfficiency: React.FC<LineupEfficiencyProps> = ({ lineupEfficiency }) => {
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
      <h2 className={styles.title}>Lineup Efficiency</h2>
      <div className={styles.cards}>
        {lineupEfficiency
          .sort((a, b) => b.efficiency - a.efficiency) // sort descending
          .map((team) => {
            const isExpanded = expandedRows.includes(team.rosterId.toString());

            // Color coding: green ≥ 0.9, yellow 0.8–0.9, red < 0.8
            let efficiencyColor = "red";
            if (team.efficiency >= 0.9) efficiencyColor = "green";
            else if (team.efficiency >= 0.8) efficiencyColor = "orange";

            return (
              <div key={team.rosterId} className={styles.card}>
                {/* Top row: Owner / Team / Efficiency */}
                <div
                  className={styles.topRow}
                  onClick={() => toggleRow(team.rosterId)}
                  style={{ cursor: "pointer" }}
                >
                  <div className={styles.ownerColumn}>
                    <div className={styles.owner}>{team.owner}</div>
                    <div style={{ color: efficiencyColor, fontWeight: 600 }}>
                      Efficiency: {(team.efficiency)}%
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
                      <div>Actual Points: {team.actual}</div>
                      <div>Optimal Points: {team.optimal}</div>
                      <div>Missed Points: {team.missedPoints}</div>
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
