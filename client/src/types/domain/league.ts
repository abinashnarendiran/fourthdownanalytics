export type LeagueType =
  | "Redraft"
  | "Dynasty"
  | "Keeper"
  | "Guillotine"
  | "Unknown";

export interface LeagueConfig {
  totalRosters?: number;
  rosterPositions?: string[];
  scoringSettings?: Record<string, number>;
  draft?: {
    draftId?: string;
    type?: string | null;
    rounds?: number | null;
    maxKeepers?: number | null;
    status?: string | null;
    startTime?: number | null;
    draftOrder?: Record<string, number | string>;
  };
  waiver?: {
    type?: number | null;
    budget?: number | null;
  };
  taxiSlots?: number;
  IRSlots?: number;
  scoringType?: string;
  playoffWeekStart?: number;
  playoffType?: number;
  playoffSeedType?: number;
  playoffTeams?: number;
  playoffRoundType?: number;
  tradeDeadline?: number;
  wavierType?: number;
}

export interface LeagueRecord {
  id: string;
  leagueId: string;
  leagueName: string;
  seasonYear: number;
  type: LeagueType | string;
  fantasyPlatformId: string;
  config: LeagueConfig;
}
