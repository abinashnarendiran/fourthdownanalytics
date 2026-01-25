import React, { useState } from "react";
import styles from "../../../styles/Dashboard.module.css";
import { KeyPlayersItem } from "./CompleteSeason";

interface KeyPlayersProps {
  keyPlayers: KeyPlayersItem[];
}

const KeyPlayers: React.FC<KeyPlayersProps> = ({ keyPlayers }) => {
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Key Contributors</h2>
      <p className={styles.subtitle}>
        The top 5 players who carried each team based on total points scored
        while in the starting lineup.
      </p>

      <div className={styles.cards}>
        {keyPlayers.map((team) => {
          const isExpanded = expandedRows.includes(team.rosterId);
          const mvp = team.keyPlayers.regularSeason[0]; // The #1 Player

          return (
            <div
              key={team.rosterId}
              className={styles.card}>
              <div
                className={styles.topRow}
                onClick={() => toggleRow(team.rosterId)}>
                <div className={styles.leftSection}>
                  <div className={styles.ownerColumn}>
                    <div className={styles.owner}>{team.owner}</div>
                    <div className={styles.teamName}>{team.teamName}</div>
                  </div>
                </div>

                <div className={styles.rightSection}>
                  {mvp && (
                    <div className={styles.mvpHighlight}>
                      <small>MVP</small>
                      <span>{mvp.fullName}</span>
                    </div>
                  )}
                  <div
                    className={`${styles.arrow} ${isExpanded ? styles.arrowExpanded : ""}`}>
                    ▼
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className={styles.keyPlayersExpanded}>
                  <div className={styles.seasonSection}>
                    <h4>Regular Season Top 5</h4>
                    <table className={styles.playerTable}>
                      <thead>
                        <tr>
                          <th className={styles.colPlayer}>Player</th>
                          <th className={styles.colPoints}>Points</th>
                          <th className={styles.colPct}>%</th>
                          <th className={styles.colWins}>Wins</th>
                        </tr>
                      </thead>
                      <tbody>
                        {team.keyPlayers.regularSeason.map((p) => (
                          <tr key={p.rank}>
                            <td className={styles.colPlayer}>{p.fullName}</td>
                            <td className={styles.colPoints}>
                              {p.totalPoints}
                            </td>
                            <td className={styles.colPct}>
                              {p.contributionPct}%
                            </td>
                            <td className={styles.colWins}>{p.wins}W</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {team.keyPlayers.playoffs.length > 0 && (
                    <div className={styles.seasonSection}>
                      <h4>Playoff Top 5</h4>
                      <table className={styles.playerTable}>
                        <tbody>
                          {team.keyPlayers.playoffs.map((p) => (
                            <tr key={p.rank}>
                              <td className={styles.colPlayer}>{p.fullName}</td>
                              <td className={styles.colPoints}>
                                {p.totalPoints}
                              </td>
                              <td className={styles.colPct}>
                                {p.contributionPct}%
                              </td>
                              <td className={styles.colWins}>{p.wins}W</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KeyPlayers;
