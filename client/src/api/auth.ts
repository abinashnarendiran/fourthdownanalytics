import { api } from "../apiConfig/client";
import type { AxiosError } from "axios";

// Generic type for API results
export type ApiResult<T = unknown> = [Error | null, T | null];

// -------------------
// User type
// -------------------
export interface User {
  userId: number;
  name: string;
  email: string;
}

// -------------------
// Auth API functions
// -------------------

// Login
export const login = async (
  email: string,
  password: string
): Promise<ApiResult<User>> => {
  try {
    const res = await api.post("/auth/login", { email, password });
    return [null, res.data]; // res.data is the user object
  } catch (err) {
    const error = err as AxiosError;
    const e: Error =
      ((error?.response?.data as unknown) as Error) ||
      (error as unknown as Error) ||
      new Error("Request failed");
    return [e, null];
  }
};

// Logout
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

// Refresh token
export const refresh = async (): Promise<ApiResult<User>> => {
  try {
    const res = await api.post("/auth/refresh");
    return [null, res.data]; // usually returns updated user
  } catch (err) {
    const error = err as AxiosError;
    const e: Error =
      ((error?.response?.data as unknown) as Error) ||
      (error as unknown as Error) ||
      new Error("Request failed");
    return [e, null];
  }
};

// Signup
export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export const signup = async (payload: SignupPayload): Promise<ApiResult<User>> => {
  try {
    const res = await api.post("/auth/signup", payload);
    return [null, res.data]; // res.data is the created user
  } catch (err) {
    const error = err as AxiosError;
    const e: Error =
      ((error?.response?.data as unknown) as Error) ||
      (error as unknown as Error) ||
      new Error("Request failed");
    return [e, null];
  }
};

// Get current logged-in user
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
