import { PlatformName } from "@/constants/platforms"; // import your PlatformName type

export interface League {
  leagueId: string; // leagueId from Sleeper
  leagueName: string; // leagueName
  seasonYear: number; // seasonYear
  type?: "Redraft" | "Dynasty" | "Keeper" | "Guillotine" | "Unknown"; // optional league type
  config?: {
    totalRosters?: number;
    rosterPositions?: string[];
    scoringSettings?: Record<string, unknown>;
    draft?: {
      rounds?: number | null;
      maxKeepers?: number | null;
    };
    waiver?: {
      type?: number | null;
      budget?: number | null;
    };
    taxiSlots?: number;
  };
  added: boolean; // whether this league is already added to the user's account
  id: string; // internal unique ID for this league (for deletion)
}

// ----------------------------
// Platform Account (user account on a platform)
// ----------------------------
export interface PlatformAccount {
  fantasyPlatformId: string; // platform-specific user ID
  username: string;
  leagues: League[];
}

// ----------------------------
// Platform wrapper (connects account to platform)
// ----------------------------
export interface Platform {
  platform: PlatformName; // "Sleeper", "ESPN", "Yahoo"

  account?: PlatformAccount; // optional if user hasn’t connected yet
}

// ----------------------------
// Unified User Platforms (all platforms for a user)
// ----------------------------
export interface UserPlatforms {
  userId: string; // internal user ID
  platforms: Platform[]; // all connected platforms
}

// User Data when adding leagues
export interface PlatformUser {
  platformUserId: string;
  platformUserName: string;
  platformDisplayName: string;
  platform: PlatformName;

  leagues: League[]; // simplest, allows anything
}

// ----------------------------
// Platform account (user account on a fantasy platform)
// ----------------------------
export interface FantasyPlatformAccount {
  fantasyPlatformId: string; // platform-specific user ID
  userId: number;
  provider: string;
  platformUserId: string;
  username: string;
}

// ----------------------------
// League configuration details
// ----------------------------
export interface FantasyLeagueConfig {
  draft: Record<string, any>;
  waiver: Record<string, any>;
  taxiSlots: number;
  scoringType: string;
  totalRosters: number;
}

// ----------------------------
// League details (internal/selector use)
// ----------------------------
export interface FantasyLeague {
  id: string; // internal unique ID
  leagueId: string; // leagueId from platform
  leagueName: string;
  seasonYear: number;
  type: string;
  fantasyPlatformId: string;
  fantasyPlatformAccount: FantasyPlatformAccount;
  config: FantasyLeagueConfig;
}

// ----------------------------
// Props for LeagueSelector component
// ----------------------------
export interface LeagueSelectorProps {
  selected?: FantasyLeague; // currently selected league
  label?: string; // label text for the selector
  className?: string; // wrapper class
  selectClassName?: string; // select element class
  onSelect?: (league: FantasyLeague) => void; // callback when a league is selected
  onGetLeagues?: (leagues: FantasyLeague[]) => void; // callback when leagues are fetched
  disabled?: boolean; // whether the selector is disabled
}
