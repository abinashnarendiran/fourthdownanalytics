export interface TeamRosterOption {
  rosterId: number;
  teamName: string;
  default?: boolean;
}

export interface TeamAnalysisWeeklyComparison {
  week: number;
  teamPoints: number;
  leagueAvg: number;
}

export interface TeamAnalysisRosterPlayer {
  playerId: string;
  name: string;
  position: string;
  team: string | null;
  status: string | null;
}

export interface TeamAnalysisPosition {
  position: string;
  rosterCount: number;
  totalPoints: number;
  averagePoints: number | null;
  leagueAveragePoints: number | null;
  vsLeagueAverage: number | null;
  players: TeamAnalysisRosterPlayer[];
}

export interface TeamAnalysisData {
  team: {
    rosterId: number;
    name: string;
    owner: string;
    actualWins: number;
    winAnalysis: {
      actualWins: number;
      actualLosses: number;
      actualTies: number;
      expectedWins: number;
      expectedLosses: number;
      winDiff: number;
      record: string;
    };
    consistency: number;
    efficiency: {
      actual: number;
      projected: number;
      optimal: number;
    };
    actualStarterPoints: number;
    optimalStarterPoints: number;
    lineupEfficiencyMetadataWarnings: string[];
    champion: boolean;
    runner_up: boolean;
    lastPlace: boolean;
    luck: {
      luckIndex: number;
      luckVariance: number;
      weeklyLuckHistory: number[];
    };
    averages: {
      teamAvg: number;
      stdDev: number;
      weeklyVsLeague: TeamAnalysisWeeklyComparison[];
      leagueAvg: number;
    };
    positionalOverview: TeamAnalysisPosition[];
    scoredWeeks: number;
  };
  compareTeamId: string | null;
}

export interface TeamComparisonData {
  primaryTeam: TeamAnalysisData["team"];
  secondaryTeam: TeamAnalysisData["team"];
  primaryPowerScore: number;
  secondaryPowerScore: number;
  primaryWinProbability: number | null;
  secondaryWinProbability: number | null;
}
