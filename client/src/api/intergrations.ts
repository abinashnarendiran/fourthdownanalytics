import { Platform, PlatformUser } from "@/types/integration.types";
import { api } from "../apiConfig/client"; // your Axios instance
import type { AxiosError } from "axios";

// Generic type for API results
export type ApiResult<T = unknown> = [Error | null, T | null];

// Fetch user platforms using Axios
export const getUserPlatforms = async (): Promise<ApiResult<Platform[]>> => {
  try {
    const response = await api.get<{ platforms: Platform[] }>(
      "integrations/userPlatforms"
    );
    return [null, response.data.platforms];
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
export const fetchSleeperAccount = async <T = PlatformUser>(
  userName: string,
  year: number
): Promise<ApiResult<T>> => {
  try {
    const response = await api.post<T>("integrations/sleeper/fetchAccount", {
      userName,
      year
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

export const addLeagues = async (
  platformData: PlatformUser
): Promise<ApiResult> => {
  try {
    await api.post("integrations/addLeagues", { platformData });
    return [null, null];
  } catch (err) {
    const error = err as AxiosError;
    const e: Error =
      (error?.response?.data as unknown as Error) ||
      (error as unknown as Error) ||
      new Error("Request failed");
    return [e, null];
  }
};

export const deleteLeague = async (
  fantasyDbLeagueId: string
): Promise<ApiResult> => {
  try {
    await api.delete(`integrations/deleteLeague/${fantasyDbLeagueId}`);
    return [null, null];
  } catch (err) {
    const error = err as AxiosError;
    const e: Error =
      (error?.response?.data as unknown as Error) ||
      (error as unknown as Error) ||
      new Error("Request failed");
    return [e, null];
  }
};

export const deleteFantasyPlatform = async (
  fantasyPlatformId: string
): Promise<ApiResult> => {
  try {
    await api.delete(`integrations/deleteFantasyPlatform/${fantasyPlatformId}`);
    return [null, null];
  } catch (err) {
    const error = err as AxiosError;
    const e: Error =
      (error?.response?.data as unknown as Error) ||
      (error as unknown as Error) ||
      new Error("Request failed");
    return [e, null];
  }
};

export const resyncPlatform = async (
  platformData: Platform
): Promise<ApiResult> => {
  try {
    await api.post("integrations/resyncPlatform", { platformData });
    return [null, null];
  } catch (err) {
    const error = err as AxiosError;
    const e: Error =
      (error?.response?.data as unknown as Error) ||
      (error as unknown as Error) ||
      new Error("Request failed");
    return [e, null];
  }
};
