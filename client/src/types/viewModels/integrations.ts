import type { LeagueConfig, LeagueType } from "@/types/domain/league";
import type { PlatformName } from "@/types/domain/platform";

export interface League {
  leagueId: string;
  leagueName: string;
  seasonYear: number;
  type?: LeagueType | string;
  config?: LeagueConfig;
  added?: boolean;
}

export interface ConnectedLeague extends League {
  id: string;
}

export interface PlatformAccount {
  fantasyPlatformId: string;
  userId?: number;
  provider?: PlatformName;
  platformUserId?: string;
  username: string;
  displayName?: string;
  leagues: ConnectedLeague[];
}

export interface Platform {
  platform: PlatformName;
  account?: PlatformAccount | null;
}

export interface PlatformUser {
  platformUserId: string;
  platformUserName: string;
  platformDisplayName: string;
  platform: PlatformName;
  leagues: League[];
}

export interface FantasyLeague {
  id: string;
  leagueId: string;
  leagueName: string;
  seasonYear: number;
  type: LeagueType | string;
  fantasyPlatformId?: string;
  config?: LeagueConfig;
}
