import type { LeagueConfig, LeagueType } from "@/types/domain/league";
import type { FantasyPlatformRecord, PlatformName } from "@/types/domain/platform";

export interface SleeperLeagueDTO {
  leagueId: string;
  leagueName: string;
  seasonYear: number;
  type: LeagueType;
  config: LeagueConfig;
  added: boolean;
}

export interface SavedLeagueDTO {
  id: string;
  leagueId: string;
  leagueName: string;
  seasonYear: number;
  type: LeagueType | string;
  config: LeagueConfig;
}

export interface PlatformAccountDTO extends FantasyPlatformRecord {
  leagues: SavedLeagueDTO[];
}

export interface PlatformDTO {
  platform: PlatformName;
  account: PlatformAccountDTO | null;
}

export interface UserPlatformsResponseDTO {
  platforms: PlatformDTO[];
}

export interface UserLeaguesResponseDTO {
  leagues: Array<
    Pick<SavedLeagueDTO, "id" | "leagueId" | "leagueName" | "seasonYear" | "type"> & {
      fantasyPlatformId?: string;
      config?: LeagueConfig;
    }
  >;
}

export interface FetchSleeperAccountResponseDTO {
  platformUserId: string;
  platformUserName: string;
  platformDisplayName: string;
  platform: PlatformName;
  leagues: SleeperLeagueDTO[];
}

export interface AddLeaguesRequestDTO {
  platformData: Pick<
    FetchSleeperAccountResponseDTO,
    "platformUserId" | "platformUserName" | "platformDisplayName" | "platform"
  > & {
    leagues: Array<
      Pick<SleeperLeagueDTO, "leagueId" | "leagueName" | "seasonYear"> & {
        type?: LeagueType | string;
        config?: LeagueConfig;
      }
    >;
  };
}

export interface ResyncPlatformRequestDTO {
  platformData: {
    platform: PlatformName;
    account: Pick<PlatformAccountDTO, "fantasyPlatformId" | "username"> & {
      leagues: Array<Pick<SavedLeagueDTO, "id" | "leagueId">>;
    };
  };
}
