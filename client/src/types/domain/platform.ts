export type { PlatformName } from "@/constants/platforms";
import type { PlatformName } from "@/constants/platforms";

export interface FantasyPlatformRecord {
  fantasyPlatformId: string;
  userId: number;
  provider: PlatformName;
  platformUserId: string;
  username: string;
  displayName: string;
}
