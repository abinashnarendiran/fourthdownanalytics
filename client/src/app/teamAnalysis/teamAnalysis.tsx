"use client";

import React, { useState } from "react";
import styles from "../../styles/Dashboard.module.css";
import DataTooltip from "../components/DataTooltip";
import TeamSelector from "../components/TeamSelector";
import { FantasyLeague } from "@/types/integration.types";

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
  rosterId: number;
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
  compareTeamId: string | null;
}

interface TeamAnalysisProps {
  data: TeamAnalysisData;
  selectedLeague: FantasyLeague;
  selectedTeam: any;
  selectedWeek: number;
  comparisonTeam: any;
  setComparisonTeam: (team: any) => void;
}

const TeamAnalysisView: React.FC<TeamAnalysisProps> = ({
  data,
  selectedLeague,
  comparisonTeam,
  setComparisonTeam,
}) => {
  const [teams, setTeams] = useState<any[]>([]); // State to hold teams for selection
  const [anaylsisData, setAnalysisData] = useState<any>(data);


  console.log(anaylsisData)

  /*   const { team } = data;
  const { averages } = team; */
  const [isExpanded, setIsExpanded] = useState(true); // Default to open for complete seasons
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
        "Measures weekly point swings using standard deviation. Lower is safer (Under 12 = Rock Solid, 12-17 = Balanced); higher is riskier (17-22 = Volatile, Over 22 = Chaotic).",
    },
    {
      label: "Expected Wins",
      description: "Projected record based on points vs the whole league.",
    },
    {
      label: "Actual Wins",
      description: "Actual record based on points vs the whole league.",
    },
    {
      label: "Actual Losses",
      description: "Actual losses based on points vs the whole league.",
    },
    {
      label: "Expected Losses",
      description: "Projected losses based on points vs the whole league.",
    },
  ];

  // Helper for performance insights
  const getInsights = () => {
    const winDiff =
      anaylsisData.team.winAnalysis.actualWins -
      anaylsisData.team.winAnalysis.expectedWins;
    const insights = [];

    if (winDiff > 0)
      insights.push(
        `Overperformed expectations by ${winDiff.toFixed(1)} wins.`,
      );
    else if (winDiff < 0)
      insights.push(
        `Underperformed expectations by ${Math.abs(winDiff).toFixed(1)} wins.`,
      );

    if (
      anaylsisData &&
      anaylsisData?.team.consistency < anaylsisData?.team.averages.stdDev
    )
      insights.push("Scoring consistency is above league average.");
    if (
      anaylsisData &&
      anaylsisData?.team.averages.teamAvg >
        anaylsisData?.team.averages.leagueAvg
    )
      insights.push(
        "Maintained a scoring average higher than the league baseline.",
      );

    return insights;
  };

  const handleCompareTeam = (team: any) => {
    console.log("Selected team for comparison:", team);
    setComparisonTeam(team);
  };

  return (
    anaylsisData && (
      <div className={styles.container}>
        <h2 className={styles.title}>
          Season Review: {anaylsisData.team.name}
        </h2>

        <div className={styles.cards}>
          <DataTooltip stats={statsDescriptions} />
          <div>
            <TeamSelector
              onGetTeams={setTeams}
              selected={comparisonTeam}
              onSelect={handleCompareTeam}
              id={selectedLeague?.id || ""}
              label="Compare Teams"
              excludeId={anaylsisData.team.rosterId}
              defaultEmpty={true}
              allowEmpty={true}
            />
          </div>
          <div
            className={`${styles.card} ${anaylsisData.team.champion ? styles.first : ""}`}>
            <div
              className={styles.topRow}
              onClick={() => setIsExpanded(!isExpanded)}>
              <div className={styles.ownerColumn}>
                <div className={styles.teamName}>{anaylsisData.team.name}</div>
                <div className={styles.owner}>
                  Manager: {anaylsisData.team.owner} |{" "}
                  {anaylsisData.team.winAnalysis.actualWins}W -{" "}
                  {anaylsisData.team.winAnalysis.actualLosses}L
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
                    Actual Wins:{" "}
                    <strong>{anaylsisData.team.winAnalysis.actualWins}</strong>
                  </div>
                  <div>
                    Expected Wins:{" "}
                    <strong>
                      {anaylsisData.team.winAnalysis.expectedWins}
                    </strong>
                  </div>
                  <div>
                    Luck Index:{" "}
                    <strong>
                      {anaylsisData.team.luck.luckIndex.toFixed(2)}
                    </strong>
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
                      <strong>{anaylsisData.team.efficiency.actual}%</strong>
                    </div>

                    <div
                      className={styles.statItem}
                      title="What your efficiency would be if you played the 'perfect' lineup every week.">
                      <small>Potential</small>
                      <strong>{anaylsisData.team.efficiency.optimal}%</strong>
                    </div>

                    <div
                      className={styles.statItem}
                      title="How well you were expected to manage your lineup based on pre-game projections.">
                      <small>Projected</small>
                      <strong>{anaylsisData.team.efficiency.projected}%</strong>
                    </div>
                  </div>

                  <hr className={styles.divider} />

                  {/* Consistency Section */}
                  <div className={styles.statGroup}>
                    <div
                      className={styles.statItem}
                      style={{ alignItems: "flex-start" }}>
                      <small>Consistency Score</small>
                      <strong>{anaylsisData.team.consistency}</strong>
                    </div>

                    <p
                      className={styles.helperText}
                      style={{
                        margin: "4px 0 0 0",
                        fontSize: "0.75rem",
                        lineHeight: "1.2",
                      }}>
                      {anaylsisData.team.consistency < 15
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
            {anaylsisData?.team?.averages?.weeklyVsLeague.map(
              (pts: { teamPoints: number; leagueAvg: number }, idx: number) => (
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
              ),
            )}
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
                <td style={{ padding: "12px" }}>
                  {anaylsisData.team.averages.teamAvg.toFixed(2)}
                </td>
                <td style={{ padding: "12px" }}>
                  {anaylsisData.team.averages.leagueAvg.toFixed(2)}
                </td>
                <td
                  style={{
                    padding: "12px",
                    fontWeight: "bold",
                    color:
                      anaylsisData.team.averages.teamAvg > anaylsisData.team.averages.leagueAvg
                        ? "#22c55e"
                        : "#ef4444",
                  }}>
                  {(
                    anaylsisData.team.averages.teamAvg - anaylsisData.team.averages.leagueAvg
                  ).toFixed(2)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "12px" }}>Volatility (Consistency)</td>
                <td style={{ padding: "12px" }}>
                  {anaylsisData.team.consistency.toFixed(2)}
                </td>
                <td style={{ padding: "12px" }}>
                  {anaylsisData.team.averages.stdDev.toFixed(2)}
                </td>
                <td style={{ padding: "12px" }}>
                  {anaylsisData.team.consistency <
                  anaylsisData.team.averages.stdDev
                    ? "✅ More Stable"
                    : "⚠️ More Volatile"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  );
};

export default TeamAnalysisView;
function setComparisonTeam(team: any) {
  throw new Error("Function not implemented.");
}

