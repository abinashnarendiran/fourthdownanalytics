import type { User } from "@/types/domain/user";

export type AuthUserDTO = User;

export interface AuthMessageDTO {
  message: string;
}

export interface SignupRequestDTO {
  name: string;
  email: string;
  password: string;
}
