import { api, mapApiResult, request } from "../apiConfig/client";
import type {
  PowerRankingDTO,
  SleeperLeagueStatusDTO,
  SleeperSeasonDataResponseDTO,
} from "@/types/api/sleeper";
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
    api.post("/sleeper/getSleeperLeagueStatus", { id }),
  );
  return mapApiResult(
    result,
    (status): DashboardLeagueStatus => ({ ...status }),
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

export const getSleeperSeasonData = async (id: string, week: number) => {
  const result = await request<SleeperSeasonDataResponseDTO>(() =>
    api.post("/sleeper/getSleeperSeasonData", { id, week }),
  );

  return mapApiResult(result, mapSeasonData);
};

export const getSleeperTeamAnalysisSeasonData = async (
  id: string,
  week: number,
  rosterId: number,
  seasonStatus: string,
  compareTeam: string | null
) => {
  const result = await request<SleeperTeamAnalysisSeasonDataResponseDTO>(() =>
    api.post("/sleeper/getSleeperTeamAnalysisSeasonData", {
      id,
      week,
      rosterId,
      seasonStatus,
      compareTeam,
    }),
  );

  return mapApiResult(result, mapTeamAnalysisSeasonData);
};