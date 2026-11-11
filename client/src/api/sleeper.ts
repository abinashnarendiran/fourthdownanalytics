import { api, mapApiResult, request } from "../apiConfig/client";
import type {
  PowerRankingDTO,
  SleeperLeagueTeamsResponseDTO,
  SleeperLeagueStatusDTO,
  SleeperSeasonDataResponseDTO,
  SleeperTeamAnalysisResponseDTO,
  SleeperTeamComparisonResponseDTO,
} from "@/types/api/sleeper";
import type { TeamRosterOption } from "@/types/viewModels/teamAnalysis";
import type {
  CompleteSeasonViewModel,
  DashboardLeagueStatus,
  DashboardSeasonData,
  DashboardSeasonResponse,
  InSeasonViewModel,
  PreDraftSeasonViewModel,
  PowerRankingViewModel,
} from "@/types/viewModels/dashboard";

export const getSleeperLeagueStatus = async (id: string) => {
  const result = await request<SleeperLeagueStatusDTO>(() =>
    api.get(`/sleeper/getSleeperLeagueStatus/${encodeURIComponent(id)}`),
  );
  return mapApiResult(result, (status): DashboardLeagueStatus => ({
    ...status,
  }));
};

export const getSleeperLeagueSeasonTeams = async (id: string) => {
  const result = await request<SleeperLeagueTeamsResponseDTO>(() =>
    api.get(`/sleeper/getSleeperLeagueSeasonTeams/${encodeURIComponent(id)}`),
  );
  return mapApiResult(result, ({ teams }): TeamRosterOption[] =>
    teams.map((team) => ({ ...team })),
  );
};

const mapRankings = (rankings: PowerRankingDTO[]): PowerRankingViewModel[] =>
  rankings.map((ranking) => ({ ...ranking }));

const mapSeasonData = (
  response: SleeperSeasonDataResponseDTO,
): DashboardSeasonResponse => {
  const { league } = response;
  let mappedLeague: DashboardSeasonData;

  if ("finalPowerRankings" in league) {
    const completeSeason: CompleteSeasonViewModel = {
      finalPowerRankings: mapRankings(league.finalPowerRankings),
    };
    mappedLeague = completeSeason;
  } else if ("powerRankings" in league) {
    const inSeason: InSeasonViewModel = {
      powerRankings: mapRankings(league.powerRankings),
    };
    mappedLeague = inSeason;
  } else {
    const preDraft: PreDraftSeasonViewModel = {
      ...league,
      teams: league.teams.map((team) => ({ ...team })),
    };
    mappedLeague = preDraft;
  }

  return {
    status: response.status,
    league: mappedLeague,
  };
};

export const getSleeperPowerRankingsSeasonData = async (
  id: string,
  week: number,
) => {
  const result = await request<SleeperSeasonDataResponseDTO>(() =>
    api.post("/sleeper/getSleeperPowerRankingsSeasonData", { id, week }),
  );

  return mapApiResult(result, mapSeasonData);
};

export const getSleeperTeamAnalysisSeasonData = async (
  id: string,
  week: number,
  rosterId: number,
  seasonStatus: SleeperLeagueStatusDTO["leagueStatus"],
  compareTeam: string | null,
) => {
  const result = await request<SleeperTeamAnalysisResponseDTO>(() =>
    api.post("/sleeper/getSleeperTeamAnalysisSeasonData", {
      id,
      week,
      rosterId,
      seasonStatus,
      compareTeam,
    }),
  );

  return mapApiResult(result, ({ teamAnalysis }) => teamAnalysis);
};

export const getSleeperTeamComparison = async (
  id: string,
  week: number,
  rosterId: number,
  compareRosterId: number,
  seasonStatus: SleeperLeagueStatusDTO["leagueStatus"],
) => {
  const result = await request<SleeperTeamComparisonResponseDTO>(() =>
    api.post("/sleeper/getSleeperTeamAnalysisSeasonData", {
      id,
      week,
      rosterId,
      compareRosterId,
      seasonStatus,
    }),
  );
  return mapApiResult(result, ({ comparison }) => comparison);
};
