import { Platform, PlatformUser } from "@/types/integration.types";
import { api } from "../apiConfig/client"; // your Axios instance
import type { AxiosError } from "axios";

// Generic type for API results
export type ApiResult<T = unknown> = [Error | null, T | null];

// Use unknown instead of any
export const getSleeperLeagueStatus = async (
  id: string,
): Promise<ApiResult> => {
  try {
    const response = await api.get(`/sleeper/getSleeperLeagueStatus/${id}`);
    return [null, response.data];
  } catch (err) {
    const error = err as AxiosError;
    const e: Error =
      (error?.response?.data as unknown as Error) ||
      (error as unknown as Error) ||
      new Error("Request failed");
    return [e, null];
  }
};

export const getSleeperLeagueSeasonTeams = async (
  id: string,
): Promise<ApiResult> => {
  try {
    const response = await api.get(`/sleeper/getSleeperLeagueSeasonTeams/${id}`);

    return [null, response.data];
  } catch (err) {
    const error = err as AxiosError;
    const e: Error =
      (error?.response?.data as unknown as Error) ||
      (error as unknown as Error) ||
      new Error("Request failed");
    return [e, null];
  }
};

export const getSleeperPowerRankingsSeasonData = async (
  id: string,
  week: number,
): Promise<ApiResult> => {
  try {
    const response = await api.post(
      "/sleeper/getSleeperPowerRankingsSeasonData",
      {
        id,
        week,
      },
    );

    return [null, response.data];
  } catch (err) {
    const error = err as AxiosError;
    const e: Error =
      (error?.response?.data as unknown as Error) ||
      (error as unknown as Error) ||
      new Error("Request failed");
    return [e, null];
  }
};

export const getSleeperTeamAnalysisSeasonData = async (
  id: string,
  week: number,
  rosterId: number,
  seasonStatus: string,
  compareTeam: string | null
): Promise<ApiResult> => {
  try {
    const response = await api.post(
      "/sleeper/getSleeperTeamAnalysisSeasonData",
      {
        id,
        week,
        rosterId,
        seasonStatus,
        compareTeam,
      },
    );

    return [null, response.data];
  } catch (err) {
    const error = err as AxiosError;
    const e: Error =
      (error?.response?.data as unknown as Error) ||
      (error as unknown as Error) ||
      new Error("Request failed");

    return [e, null];
  }
};
