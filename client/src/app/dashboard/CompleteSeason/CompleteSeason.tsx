import React from "react";
import PowerRankings from "./PowerRankings";
import LuckIndex from "./LuckIndex";
import LineupEfficiency from "./LineupEfficiency";

// Optional: import future components
// import WinsVsExpected from "./wins-vs-expected/WinsVsExpected";
// import ChampionshipsSummary from "./championships-summary/ChampionshipsSummary";

export interface PowerRankingsData {
  rosterId: number;
  owner: string;
  totalPoints: number;
  playoffPoints: number;
  wins: number;
  expectedWins: number;
  luck: number;
  consistency: number;
  strengthOfSchedule: number;
  championship: boolean;
  runnerUp: boolean;
  lastPlace: boolean;
  rank: number;
  powerScore: number;
}

export interface LuckItem {
  rosterId: string | number;
  owner: string; // added owner
  actualWins: number;
  expectedWins: number;
  luck: number;
}

export interface LineupEfficiencyItem {
  rosterId: string | number;
  owner?: string;
  actual: number;
  optimal: number;
  missedPoints: number;
  efficiency: number; // float 0-1
}

export interface SeasonData {
  finalPowerRankings: PowerRankingsData[];
  luckIndex: LuckItem[];
  lineupEfficiency: LineupEfficiencyItem[];
  // You can add other season objects later, e.g.,
  // standings?: TeamData[];
  // matchups?: MatchupData[];
}

interface CompleteSeasonProps {
  seasonData: SeasonData;
}
const CompleteSeason: React.FC<CompleteSeasonProps> = ({ seasonData }) => {
  return (
    <div style={{ padding: "2rem" }}>
      <PowerRankings
        finalPowerRankings={seasonData?.finalPowerRankings || []}
      />
      <LuckIndex luckIndex={seasonData?.luckIndex || []} />
      <LineupEfficiency
        lineupEfficiency={seasonData?.lineupEfficiency || []}
      />
    </div>
  );
};

export default CompleteSeason;
