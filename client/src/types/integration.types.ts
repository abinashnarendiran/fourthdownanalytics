export interface League {
  id: string;
  name: string;
  year: number;
  added?: boolean;       // optional, true if already added
  accountId?: string;    // optional, to attach leagues
}

export interface PlatformAccount {
  id: string;
  username: string;
  leagues: League[];
}

export interface Platform {
  platform: string;             // "sleeper", "espn", etc.
  account?: PlatformAccount;
}
