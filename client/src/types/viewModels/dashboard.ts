export interface PowerRankingViewModel {
  rosterId: number;
  owner: string;
  teamName: string;
  totalPoints: number;
  wins: number;
  actualWins: number;
  expectedWins: number;
  luckIndex: number;
  actualStarterPoints: number;
  optimalStarterPoints: number;
  lineupEfficiency: number | null;
  lineupEfficiencyWeeksScored: number;
  lineupEfficiencyWeeksUnscored: number;
  lineupEfficiencyWeeksUnavailable: number;
  lineupEfficiencyMetadataWarnings: string[];
  championship: boolean;
  runnerUp: boolean;
  lastPlace: boolean;
  powerScore: number;
  rank: number;
  trend: string;
  rankChange: number;
}

export interface CompleteSeasonViewModel {
  finalPowerRankings: PowerRankingViewModel[];
}

export interface InSeasonViewModel {
  powerRankings: PowerRankingViewModel[];
}

export interface PreDraftSeasonViewModel {
  leagueId: string;
  seasonYear: number;
  leagueType: string;
  draftType: string;
  draftDate: string;
  scoringType: string;
  draftComplete: string;
  draftPosition: number | string | null;
  wavierType: string;
  rosterPositions: string[];
  scoringSettings?: Record<string, number>;
  IRSlots: number;
  playoffTeams: number;
  playoffWeeks: number;
  regularSeasonWeeks: number;
  taxiSlots: number;
  tradeDeadlineWeek: number | string;
  teams: Array<{
    teamName: string;
    ownerName: string;
    coOwners: string[];
  }>;
}

export type DashboardSeasonData =
  | CompleteSeasonViewModel
  | InSeasonViewModel
  | PreDraftSeasonViewModel;

export interface DashboardSeasonResponse {
  status: string;
  league: DashboardSeasonData;
}

export interface DashboardLeagueStatus {
  seasonYear: number | string;
  currentWeek: number | null;
  leagueStatus: string;
  seasonFinished: boolean;
}
