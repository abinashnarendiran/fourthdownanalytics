// constants/platforms.ts

// ----------------------------
// Platform constants
// ----------------------------
export const PLATFORMS = {
  Sleeper: "Sleeper",
  ESPN: "ESPN",
  Yahoo: "Yahoo",
} as const;

// Only the platforms you want to enable for now
export const ENABLED_PLATFORMS = [PLATFORMS.Sleeper] as const;

// Type-safe union of **enabled platforms**
export type PlatformName = typeof ENABLED_PLATFORMS[number]; // "Sleeper"