"use client";

import React, { useState } from "react";
import styles from "../../styles/Dashboard.module.css";
import DataTooltip from "../components/DataTooltip";

export interface TeamLuck {
  luckIndex: number;
  luckVariance: number;
  weeklyLuckHistory: number[];
}

export interface WeeklyComparison {
  week: number;
  teamPoints: number;
  leagueAvg: number;
}

export interface WinAnalysis {
  actualWins: number;
  actualLosses: number;
  expectedWins: number;
  expectedLosses: number;
  winDiff: number;
  record: string; // Helpful for UI
}

export interface Team {
  id: number;
  name: string;
  owner: string;
  actualWins: number;
  winAnalysis: WinAnalysis;
  consistency: number;
  efficiency: {
    actual: number;
    projected: number;
    optimal: number;
  };
  champion: boolean;
  runner_up: boolean; // Note: Consistency in camelCase vs snake_case is key
  lastPlace: boolean;
  luck: TeamLuck;
  averages: {
    teamAvg: number;
    stdDev: number;
    weeklyVsLeague: WeeklyComparison[];
    leagueAvg: number;
  };
}

export interface TeamAnalysisData {
  team: Team;
}

interface TeamAnalysisProps {
  data: TeamAnalysisData;
}

const TeamAnalysisView: React.FC<TeamAnalysisProps> = ({ data }) => {
  const { team } = data;
  const { averages } = team;
  const [isExpanded, setIsExpanded] = useState(true); // Default to open for complete seasons
  console.log("Rendering TeamAnalysisView with data:", data);
  const statsDescriptions = [
    {
      label: "Luck Index",
      description:
        "Total wins minus wins expected by your scoring. Positive numbers mean you're getting lucky matchups; negative means a tough schedule.",
    },
    {
      label: "Lineup Efficiency",
      description: "Percentage of maximum possible points actually started.",
    },
    {
      label: "Consistency Score",
      description:
        "Measures weekly scoring variance. Scores between 10-15 are considered highly reliable, while 18+ indicates a 'boom-or-bust' team.",
    },
    {
      label: "Expected Wins",
      description: "Projected record based on points vs the whole league.",
    },
  ];

  // Helper for performance insights
  const getInsights = () => {
    const winDiff = team.winAnalysis.actualWins - team.winAnalysis.expectedWins;
    const insights = [];

    if (winDiff > 0)
      insights.push(
        `Overperformed expectations by ${winDiff.toFixed(1)} wins.`,
      );
    else if (winDiff < 0)
      insights.push(
        `Underperformed expectations by ${Math.abs(winDiff).toFixed(1)} wins.`,
      );

    if (team.consistency < averages.stdDev)
      insights.push("Scoring consistency is above league average.");
    if (averages.teamAvg > averages.leagueAvg)
      insights.push(
        "Maintained a scoring average higher than the league baseline.",
      );

    return insights;
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Season Review: {team.name}</h2>

      <div className={styles.cards}>
        <DataTooltip stats={statsDescriptions} />
        <div className={`${styles.card} ${team.champion ? styles.first : ""}`}>
          <div
            className={styles.topRow}
            onClick={() => setIsExpanded(!isExpanded)}>
            <div className={styles.ownerColumn}>
              <div className={styles.teamName}>{team.name}</div>
              <div className={styles.owner}>
                Manager: {team.owner} | {team.winAnalysis.actualWins}W -{" "}
                {team.winAnalysis.actualLosses}L
              </div>
            </div>
            <div
              className={`${styles.arrow} ${isExpanded ? styles.arrowExpanded : ""}`}>
              ▼
            </div>
          </div>

          {isExpanded && (
            <div className={styles.expandedStats}>
              <div className={styles.statColumn}>
                <h4>Win/Loss Analytics</h4>
                <div>
                  Actual Wins: <strong>{team.winAnalysis.actualWins}</strong>
                </div>
                <div>
                  Expected Wins:{" "}
                  <strong>{team.winAnalysis.expectedWins}</strong>
                </div>
                <div>
                  Luck Index: <strong>{team.luck.luckIndex.toFixed(2)}</strong>
                </div>
              </div>

              <div className={styles.statColumn}>
                <h4>Management & Reliability</h4>

                {/* Efficiency Section */}
                <div
                  className={styles.statGroup}
                  style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  <div
                    className={styles.statItem}
                    title="The percentage of your total roster's points you actually started.">
                    <small>Lineup Eff.</small>
                    <strong>{team.efficiency.actual}%</strong>
                  </div>

                  <div
                    className={styles.statItem}
                    title="What your efficiency would be if you played the 'perfect' lineup every week.">
                    <small>Potential</small>
                    <strong>{team.efficiency.optimal}%</strong>
                  </div>

                  <div
                    className={styles.statItem}
                    title="How well you were expected to manage your lineup based on pre-game projections.">
                    <small>Projected</small>
                    <strong>{team.efficiency.projected}%</strong>
                  </div>
                </div>

                <hr className={styles.divider} />

                {/* Consistency Section */}
                <div className={styles.statGroup}>
                  <div
                    className={styles.statItem}
                    style={{ alignItems: "flex-start" }}>
                    <small>Consistency Score</small>
                    <strong>{team.consistency}</strong>
                  </div>

                  <p
                    className={styles.helperText}
                    style={{
                      margin: "4px 0 0 0",
                      fontSize: "0.75rem",
                      lineHeight: "1.2",
                    }}>
                    {team.consistency < 15
                      ? "Very Reliable: Small scoring swings week-to-week."
                      : "High Volatility: A 'boom-or-bust' team with large swings."}
                  </p>
                </div>
              </div>

              <div className={styles.statColumn}>
                <h4>Generated Insights</h4>
                {getInsights().map((text, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: "0.85rem",
                      color: "#4ade80",
                      marginBottom: "4px",
                    }}>
                    • {text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div
        className={styles.chartContainer}
        style={{
          marginTop: "2rem",
          background: "#1a1a1a",
          padding: "1.5rem",
          borderRadius: "12px",
        }}>
        <h3 style={{ marginBottom: "1rem" }}>
          Weekly Points vs League Average
        </h3>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            height: "200px",
            gap: "8px",
            paddingBottom: "20px",
            borderBottom: "1px solid #333",
          }}>
          {averages.weeklyVsLeague.map((pts, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
              }}>
              {/* Team Bar */}
              <div
                style={{
                  width: "100%",
                  height: `${(pts.teamPoints / 200) * 150}px`,
                  background:
                    pts.teamPoints > pts.leagueAvg ? "#4ade80" : "#f87171",
                  borderRadius: "4px 4px 0 0",
                }}
                title={`Week ${idx + 1}: ${pts}`}
              />
              <span style={{ fontSize: "10px", color: "#888" }}>
                W{idx + 1}
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: "10px",
            fontSize: "12px",
            color: "#888",
            textAlign: "center",
          }}>
          <span style={{ color: "#4ade80" }}>■</span> Above Avg |{" "}
          <span style={{ color: "#f87171" }}>■</span> Below Avg
        </div>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <h3 style={{ color: "#333", marginBottom: "1rem" }}>
          League Comparison
        </h3>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            color: "#333", // Changed from #fff to #333
            backgroundColor: "#f9f9f9", // Light background to distinguish the table
            borderRadius: "8px",
            overflow: "hidden",
          }}>
          <thead>
            <tr style={{ backgroundColor: "#ececec", textAlign: "left" }}>
              <th style={{ padding: "12px" }}>Metric</th>
              <th style={{ padding: "12px" }}>Your Team</th>
              <th style={{ padding: "12px" }}>League Avg</th>
              <th style={{ padding: "12px" }}>Difference</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "12px" }}>Avg Points</td>
              <td style={{ padding: "12px" }}>{averages.teamAvg.toFixed(2)}</td>
              <td style={{ padding: "12px" }}>
                {averages.leagueAvg.toFixed(2)}
              </td>
              <td
                style={{
                  padding: "12px",
                  fontWeight: "bold",
                  color:
                    averages.teamAvg > averages.leagueAvg
                      ? "#22c55e"
                      : "#ef4444",
                }}>
                {(averages.teamAvg - averages.leagueAvg).toFixed(2)}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "12px" }}>Volatility (Consistency)</td>
              <td style={{ padding: "12px" }}>{team.consistency.toFixed(2)}</td>
              <td style={{ padding: "12px" }}>{averages.stdDev.toFixed(2)}</td>
              <td style={{ padding: "12px" }}>
                {team.consistency < averages.stdDev
                  ? "✅ More Stable"
                  : "⚠️ More Volatile"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamAnalysisView;
