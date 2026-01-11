import { Platform } from "@/types/integration.types";
import { api } from "../apiConfig/client"; // your Axios instance
import type { AxiosError } from "axios";

// Generic type for API results
export type ApiResult<T = unknown> = [Error | null, T | null];

// Fetch user platforms using Axios
export const getUserPlatforms = async (): Promise<ApiResult<Platform[]>> => {
  try {
    const response = await api.get<{ platforms: Platform[] }>("integrations/userPlatforms");
    return [null, response.data.platforms];
  } catch (err) {
    // Type-safe Axios error handling
    let error: Error;

    if (err && (err as AxiosError).isAxiosError) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      error = new Error(
        axiosErr.response?.data?.message || axiosErr.message || "Request failed"
      );
    } else {
      error = err instanceof Error ? err : new Error("Request failed");
    }

    return [error, null];
  }
};


// Use unknown instead of any
export const fetchSleeperAccount = async <T = unknown>(
  userName: string,
  year: number
): Promise<ApiResult<T>> => {
  try {
    const response = await api.post<T>("integrations/sleeper/fetchAccount", { userName, year });

    return [null, response.data];
  } catch (err) {
    let error: Error;

    if (err && (err as AxiosError).isAxiosError) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      error = new Error(
        axiosErr.response?.data?.message || axiosErr.message || "Request failed"
      );
    } else {
      error = err instanceof Error ? err : new Error("Request failed");
    }

    return [error, null];
  }
};

