import { api, mapApiResult, request } from "../apiConfig/client";
import type { ApiResult } from "../apiConfig/client";
import type {
  AddLeaguesRequestDTO,
  FetchSleeperAccountResponseDTO,
  ResyncPlatformRequestDTO,
  UserPlatformsResponseDTO,
} from "@/types/api/integrations";
import type {
  Platform,
  PlatformUser,
  ConnectedLeague,
} from "@/types/viewModels/integrations";

export const getUserPlatforms = async (): Promise<ApiResult<Platform[]>> => {
  const result = await request<UserPlatformsResponseDTO>(() =>
    api.get("integrations/userPlatforms"),
  );

  return mapApiResult(result, ({ platforms }) =>
    platforms.map((platform) => ({
      ...platform,
      account: platform.account
        ? {
            ...platform.account,
            leagues: platform.account.leagues.map(
              (league): ConnectedLeague => ({ ...league }),
            ),
          }
        : null,
    })),
  );
};

export const fetchSleeperAccount = async (
  userName: string,
  year: number,
) => {
  const result = await request<FetchSleeperAccountResponseDTO>(() =>
    api.post("integrations/sleeper/fetchAccount", { userName, year }),
  );

  return mapApiResult(result, (account): PlatformUser => ({ ...account }));
};

export const addLeagues = async (
  platformData: PlatformUser,
): Promise<ApiResult<null>> => {
  const payload: AddLeaguesRequestDTO = { platformData };
  const [error] = await request<unknown>(() =>
    api.post("integrations/addLeagues", payload),
  );
  return [error, null];
};

export const deleteLeague = async (
  fantasyDbLeagueId: string,
): Promise<ApiResult<null>> => {
  const [error] = await request<unknown>(() =>
    api.delete(`integrations/deleteLeague/${fantasyDbLeagueId}`),
  );
  return [error, null];
};

export const deleteFantasyPlatform = async (
  fantasyPlatformId: string,
): Promise<ApiResult<null>> => {
  const [error] = await request<unknown>(() =>
    api.delete(`integrations/deleteFantasyPlatform/${fantasyPlatformId}`),
  );
  return [error, null];
};

export const resyncPlatform = async (
  platformData: Platform & { account: NonNullable<Platform["account"]> },
): Promise<ApiResult<null>> => {
  const payload: ResyncPlatformRequestDTO = { platformData };
  const [error] = await request<unknown>(() =>
    api.post("integrations/resyncPlatform", payload),
  );
  return [error, null];
};
