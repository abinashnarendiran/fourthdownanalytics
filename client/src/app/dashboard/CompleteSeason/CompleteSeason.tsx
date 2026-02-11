import React from "react";
import PowerRankings from "./PowerRankings";

// Optional: import future components
// import WinsVsExpected from "./wins-vs-expected/WinsVsExpected";
// import ChampionshipsSummary from "./championships-summary/ChampionshipsSummary";

export interface PowerRankingsData {
  rosterId: number; // Unique team identifier
  owner: string; // Owner display name
  teamName: string; // Custom team name
  totalPoints: number; // Regular season points
  wins: number; // Regular season wins
  championship: boolean; // Won the league
  runnerUp: boolean; // Finished 2nd
  lastPlace: boolean; // Finished last
  powerScore: number; // Overall score combining all metrics
  rank: number; // Current rank
  trend: string; // Trend indicator: '▲' | '▼' | '—'
  rankChange: number; // Numeric change from previous week (positive = moved up)
}

export interface SeasonData {
  finalPowerRankings: PowerRankingsData[];
}

interface CompleteSeasonProps {
  seasonData: SeasonData;
}
const CompleteSeason: React.FC<CompleteSeasonProps> = ({ seasonData }) => {
  return (
    <div style={{ padding: "2rem" }}>
      <PowerRankings
        powerRankings={seasonData?.finalPowerRankings || []}
        isInSeason={false}
      />
    </div>
  );
};

export default CompleteSeason;
