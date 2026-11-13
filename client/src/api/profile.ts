import { api, request } from "../apiConfig/client";
import type { AuthMessageDTO, AuthUserDTO } from "@/types/api/auth";
import type {
  ChangePasswordRequestDTO,
  ProfileResponseDTO,
  UpdateProfileRequestDTO,
} from "@/types/api/profile";

export const getProfile = () =>
  request<ProfileResponseDTO>(() => api.get("/profile"));

export const updateProfile = (payload: UpdateProfileRequestDTO) =>
  request<AuthUserDTO>(() => api.patch("/profile", payload));

export const changePassword = (payload: ChangePasswordRequestDTO) =>
  request<AuthMessageDTO>(() => api.put("/profile/password", payload));
