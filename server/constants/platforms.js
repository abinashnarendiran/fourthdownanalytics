// constants/platforms.js

// All possible platforms
const ALL_PLATFORMS = ["Sleeper", "ESPN", "Yahoo"];

// Platforms currently enabled (array)
const ENABLED_PLATFORMS = ["Sleeper"];

// Add object-style access
ENABLED_PLATFORMS.SLEEPER = "Sleeper";
// You could add others later if enabled
// ENABLED_PLATFORMS.ESPN = "ESPN";

module.exports = {
  ALL_PLATFORMS,
  ENABLED_PLATFORMS,
};