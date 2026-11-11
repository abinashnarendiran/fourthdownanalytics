import type { LeagueConfig } from "@/types/domain/league";
import type { TeamAnalysisData } from "@/types/viewModels/teamAnalysis";

export interface SleeperLeagueStatusDTO {
  seasonYear: number | string;
  currentWeek: number | null;
  leagueStatus: "pre_draft" | "in_season" | "complete" | string;
  seasonFinished: boolean;
}

export interface SleeperLeagueTeamsResponseDTO {
  teams: Array<{
    rosterId: number;
    teamName: string;
    default?: boolean;
  }>;
}

export interface SleeperTeamAnalysisResponseDTO {
  teamAnalysis: TeamAnalysisData;
}

export interface PowerRankingDTO {
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

export interface CompleteSeasonDTO {
  finalPowerRankings: PowerRankingDTO[];
}

export interface InSeasonDTO {
  powerRankings: PowerRankingDTO[];
}

export interface PreDraftSeasonDTO {
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
  scoringSettings?: LeagueConfig["scoringSettings"];
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

export interface SleeperSeasonDataResponseDTO {
  status: "pre_draft" | "in_season" | "complete" | string;
  league: CompleteSeasonDTO | InSeasonDTO | PreDraftSeasonDTO;
}
