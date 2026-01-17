import { Platform, PlatformUser } from "@/types/integration.types";
import { api } from "../apiConfig/client"; // your Axios instance
import type { AxiosError } from "axios";

// Generic type for API results
export type ApiResult<T = unknown> = [Error | null, T | null];

// Fetch user platforms using Axios
export const getUserLeagues = async (): Promise<ApiResult<any>> => {
  try {
    const response = await api.get("/leagues/getUserLeagues ");
    return [null, response.data]; // return full response data
  } catch (err) {
    const error = err as AxiosError;
    const e: Error =
      (error?.response?.data as unknown as Error) ||
      (error as unknown as Error) ||
      new Error("Request failed");
    return [e, null];
  }
};

