import { Platform, PlatformUser } from "@/types/integration.types";
import { api } from "../apiConfig/client"; // your Axios instance
import type { AxiosError } from "axios";

// Generic type for API results
export type ApiResult<T = unknown> = [Error | null, T | null];

// Use unknown instead of any
export const getSleeperLeagueStatus = async (
  id: string
): Promise<ApiResult> => {
  try {
    const response = await api.post("/sleeper/getSleeperLeagueStatus", {
      id
    });

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

// Use unknown instead of any
export const getSleeperCompleteSeasonData = async (
  id: string
): Promise<ApiResult> => {
  try {
    const response = await api.post("/sleeper/getSleeperCompleteSeasonData", {
      id
    });

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


