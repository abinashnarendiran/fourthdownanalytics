export interface TeamRosterOption {
  rosterId: number;
  teamName: string;
  default?: boolean;
}

export type TeamAnalysisMetricTab = "overview" | "schedule" | "positions";

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

export interface ScheduleLuckDistribution {
  distribution: Array<{
    wins: number;
    losses: number;
    count: number;
    probability: number;
  }>;
  schedulesAvailable: number;
  schedulesEvaluated: number;
  incompleteSchedules: number;
  weeksPerSchedule: number;
}

export interface TeamAnalysisRadarAxis {
  position: "QB" | "RB" | "WR" | "TE";
  team: number | null;
  leagueAverage: number | null;
  leagueLeader: number | null;
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
    coaching: {
      actualPoints: number | null;
      optimalPoints: number | null;
      pointsLeft: number | null;
      coachingIQ: number | null;
      weeksIncluded: number;
      weeksUnavailable: number;
      weeklyScoreStdDev: number;
      metadataWarnings: string[];
    };
    scheduleLuck: ScheduleLuckDistribution;
    positionalRadar: TeamAnalysisRadarAxis[];
    dataCoverage: {
      requestedWeeks: number;
      scoredWeeks: number;
      omittedWeeks: number;
    };
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
  scoreDistribution: {
    primary: {
      mean: number;
      standardDeviation: number;
      points: Array<{ score: number; density: number }>;
    };
    secondary: {
      mean: number;
      standardDeviation: number;
      points: Array<{ score: number; density: number }>;
    };
    selectedWeek: number;
    primarySwap: {
      starterId: string;
      benchId: string;
      pointsDelta: number;
    } | null;
    secondarySwap: {
      starterId: string;
      benchId: string;
      pointsDelta: number;
    } | null;
    primarySwapOptions: {
      starters: TeamComparisonPlayerOption[];
      bench: TeamComparisonPlayerOption[];
    };
    secondarySwapOptions: {
      starters: TeamComparisonPlayerOption[];
      bench: TeamComparisonPlayerOption[];
    };
  };
}

export interface TeamComparisonPlayerOption {
  playerId: string;
  name: string;
  position: string;
  points: number;
  isStarter: boolean;
}

export interface TeamComparisonSwap {
  starterId: string;
  benchId: string;
}
