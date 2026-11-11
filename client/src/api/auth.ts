import { api, request } from "../apiConfig/client";
import type {
  AuthMessageDTO,
  AuthUserDTO,
  SignupRequestDTO,
} from "@/types/api/auth";

export type { User } from "@/types/domain/user";

export const login = (email: string, password: string) =>
  request<AuthUserDTO>(() => api.post("/auth/login", { email, password }));

export const logout = () =>
  request<AuthMessageDTO>(() => api.post("/auth/logout"));

export const refresh = () =>
  request<AuthMessageDTO>(() => api.post("/auth/refresh"));

export type SignupPayload = SignupRequestDTO;

export const signup = (payload: SignupPayload) =>
  request<AuthUserDTO>(() => api.post("/auth/signup", payload));

export const getMe = () =>
  request<AuthUserDTO>(() => api.get("/auth/me"));
