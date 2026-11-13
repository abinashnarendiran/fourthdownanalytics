export interface ProfileUserDTO {
  userId: number;
  name: string;
  email: string;
  createdAt: string;
}

export interface ProfileSleeperDTO {
  connected: boolean;
  username: string | null;
  displayName: string | null;
  platformUserId: string | null;
}

export interface ProfileResponseDTO {
  user: ProfileUserDTO;
  sleeper: ProfileSleeperDTO;
  activeLeagueCount: number;
}

export interface UpdateProfileRequestDTO {
  name: string;
  email: string;
}

export interface ChangePasswordRequestDTO {
  currentPassword: string;
  newPassword: string;
}
