import type { User } from "@/types/domain/user";
import type { FantasyLeague, Platform } from "@/types/viewModels/integrations";
import type { PowerRankingViewModel } from "@/types/viewModels/dashboard";

export const API_BASE_URL = "http://localhost:5000/api";

export const userFixture: User = {
  userId: 1,
  name: "Test User",
  email: "test@example.com",
};

export const makeLeague = (overrides: Partial<FantasyLeague> = {}): FantasyLeague => ({
  id: "db-league-1",
  leagueId: "sleeper-league-1",
  leagueName: "Test League",
  seasonYear: 2024,
  type: "redraft",
  fantasyPlatformId: "platform-1",
  ...overrides,
});

export const makeRanking = (
  overrides: Partial<PowerRankingViewModel> = {},
): PowerRankingViewModel => ({
  rosterId: 1,
  owner: "owner-1",
  teamName: "Team One",
  totalPoints: 1500,
  wins: 10,
  actualWins: 10,
  expectedWins: 8,
  luckIndex: 2,
  actualStarterPoints: 1500,
  optimalStarterPoints: 1600,
  lineupEfficiency: 93.75,
  lineupEfficiencyWeeksScored: 14,
  lineupEfficiencyWeeksUnscored: 0,
  lineupEfficiencyWeeksUnavailable: 0,
  lineupEfficiencyMetadataWarnings: [],
  championship: false,
  runnerUp: false,
  lastPlace: false,
  powerScore: 88,
  rank: 1,
  trend: "up",
  rankChange: 2,
  ...overrides,
});

export const makePlatform = (overrides: Partial<Platform> = {}): Platform => ({
  platform: "Sleeper",
  account: null,
  ...overrides,
});
