import { api } from "../apiConfig/client";
import type { AxiosError } from "axios";

type ApiResult<T = unknown> = [Error | null, T | null];

// Standalone login function
export const login = async (email: string, password: string): Promise<ApiResult> => {
  try {
    const res = await api.post("/auth/login", { email, password });
    return [null, res.data];
  } catch (err) {
    const error = err as AxiosError;
    const e: Error =
      ((error?.response?.data as unknown) as Error) ||
      (error as unknown as Error) ||
      new Error("Request failed");
    return [e, null];
  }
};

// Logout function
export const logout = async (): Promise<ApiResult> => {
  try {
    const res = await api.post("/auth/logout");
    return [null, res.data];
  } catch (err) {
    const error = err as AxiosError;
    const e: Error =
      ((error?.response?.data as unknown) as Error) ||
      (error as unknown as Error) ||
      new Error("Request failed");
    return [e, null];
  }
};

// Refresh token function
export const refresh = async (): Promise<ApiResult> => {
  try {
    const res = await api.post("/auth/refresh");
    return [null, res.data];
  } catch (err) {
    const error = err as AxiosError;
    const e: Error =
      ((error?.response?.data as unknown) as Error) ||
      (error as unknown as Error) ||
      new Error("Request failed");
    return [e, null];
  }
};

// ✅ Signup function
export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export const signup = async (payload: SignupPayload): Promise<ApiResult> => {
  try {
    const res = await api.post("/auth/signup", payload);
    return [null, res.data];
  } catch (err) {
    const error = err as AxiosError;
    const e: Error =
      ((error?.response?.data as unknown) as Error) ||
      (error as unknown as Error) ||
      new Error("Request failed");
    return [e, null];
  }
};

// ✅ Get current user function
export interface User {
  id: number;
  name: string;
  email: string;
}

export const getMe = async (): Promise<ApiResult<User>> => {
  try {
    const res = await api.get("/auth/me");
    return [null, res.data];
  } catch (err) {
    const error = err as AxiosError;
    const e: Error =
      ((error?.response?.data as unknown) as Error) ||
      (error as unknown as Error) ||
      new Error("Request failed");
    return [e, null];
  }
};