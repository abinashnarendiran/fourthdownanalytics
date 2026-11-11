import { api, mapApiResult, request } from "../apiConfig/client";
import type { ApiResult } from "../apiConfig/client";
import type { UserLeaguesResponseDTO } from "@/types/api/integrations";
import type { FantasyLeague } from "@/types/viewModels/integrations";

export const getUserLeagues = async (): Promise<ApiResult<FantasyLeague[]>> => {
  const result = await request<UserLeaguesResponseDTO>(() =>
    api.get("/leagues/getUserLeagues"),
  );

  return mapApiResult(result, ({ leagues }) =>
    leagues.map((league) => ({
      ...league,
      fantasyPlatformId: league.fantasyPlatformId,
    })),
  );
};
